import "server-only";

import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { writeAuditLog } from "@/features/audit/mutations";
import { emitEvent } from "@/features/automations/dispatcher";
import { autoCloseFollowUpsForQuote } from "@/features/follow-ups/mutations";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  followUps,
  inquiries,
  postWinChecklistItems,
  quoteItems,
  quotes,
  businesses,
  } from "@/lib/db/schema";
import type { QuoteEditorInput } from "@/features/quotes/schemas";
import type { QuoteDeliveryMethod, QuoteStatus } from "@/features/quotes/types";
import {
  getTodayUtcDateString,
} from "@/features/quotes/utils";
import { insertBusinessNotification } from "@/features/notifications/mutations";
import {
  createStoredQuotePublicToken,
  getQuotePublicTokenLookupCondition,
  tryResolveStoredQuotePublicToken,
} from "@/features/quotes/token-storage";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function getNextQuoteNumberFromSequence(sequence: number | null | undefined) {
  const safeSequence =
    typeof sequence === "number" && Number.isFinite(sequence) && sequence > 0
      ? Math.trunc(sequence)
      : 0;

  return `Q-${String(safeSequence + 1).padStart(4, "0")}`;
}

function calculateQuoteTotals(input: QuoteEditorInput) {
  const items = input.items.map((item, index) => ({
    id: createId("qit"),
    description: item.description,
    quantity: item.quantity,
    unitPriceInCents: item.unitPriceInCents,
    lineTotalInCents: item.quantity * item.unitPriceInCents,
    position: index,
  }));
  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.lineTotalInCents,
    0,
  );
  const taxInCents = input.taxInCents ?? 0;
  const totalInCents = subtotalInCents - input.discountInCents + taxInCents;

  return {
    items,
    subtotalInCents,
    discountInCents: input.discountInCents,
    taxInCents,
    totalInCents,
  };
}

function isRetryableUniqueConflict(error: unknown) {
  return (
      typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505" &&
    (("constraint_name" in error &&
      (error.constraint_name === "quotes_business_quote_number_unique" ||
        error.constraint_name === "quotes_public_token_unique" ||
        error.constraint_name === "quotes_public_token_hash_unique")) ||
      ("constraint" in error &&
        (error.constraint === "quotes_business_quote_number_unique" ||
          error.constraint === "quotes_public_token_unique" ||
          error.constraint === "quotes_public_token_hash_unique")))
  );
}

function truncateNotificationMessage(
  value: string | null | undefined,
  maxLength = 120,
) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.length <= maxLength) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, maxLength - 3).trimEnd()}...`;
}

function getStoredEffectiveQuoteStatus(
  status: QuoteStatus,
  validUntil: string,
) {
  return status === "sent" && validUntil < getTodayUtcDateString()
    ? "expired"
    : status;
}

async function maybeMoveInquiryToQuoted(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  businessId: string,
  inquiryId: string | null,
  now: Date,
) {
  if (!inquiryId) {
    return false;
  }

  const [updatedInquiry] = await tx
    .update(inquiries)
    .set({
      status: "quoted",
      updatedAt: now,
    })
    .where(
      and(
        eq(inquiries.id, inquiryId),
        eq(inquiries.businessId, businessId),
        inArray(inquiries.status, ["new", "waiting"]),
        isNull(inquiries.archivedAt),
      ),
    )
    .returning({ id: inquiries.id });

  return Boolean(updatedInquiry);
}

async function maybeMoveInquiryToWon(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  businessId: string,
  inquiryId: string | null,
  now: Date,
) {
  if (!inquiryId) {
    return false;
  }

  const [updatedInquiry] = await tx
    .update(inquiries)
    .set({
      status: "won",
      updatedAt: now,
    })
    .where(
      and(
        eq(inquiries.id, inquiryId),
        eq(inquiries.businessId, businessId),
        inArray(inquiries.status, ["new", "quoted", "waiting"]),
        isNull(inquiries.archivedAt),
      ),
    )
    .returning({ id: inquiries.id });

  return Boolean(updatedInquiry);
}

async function insertQuoteActivity(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  {
    businessId,
    inquiryId,
    quoteId,
    actorUserId,
    type,
    summary,
    metadata,
    now,
  }: {
    businessId: string;
    inquiryId?: string | null;
    quoteId: string;
    actorUserId?: string | null;
    type: string;
    summary: string;
    metadata?: Record<string, unknown>;
    now: Date;
  },
) {
  await tx.insert(activityLogs).values({
    id: createId("act"),
    businessId,
    inquiryId: inquiryId ?? null,
    quoteId,
    actorUserId: actorUserId ?? null,
    type,
    summary,
    metadata: metadata ?? {},
    createdAt: now,
    updatedAt: now,
  });
}

async function expireQuoteRows(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  rows: Array<{
    id: string;
    businessId: string;
    inquiryId: string | null;
    quoteNumber: string;
  }>,
) {
  if (!rows.length) {
    return 0;
  }

  const now = new Date();

  await tx
    .update(quotes)
    .set({
      status: "expired",
      updatedAt: now,
    })
    .where(inArray(quotes.id, rows.map((row) => row.id)));

  await tx.insert(activityLogs).values(
    rows.map((row) => ({
      id: createId("act"),
      businessId: row.businessId,
      inquiryId: row.inquiryId,
      quoteId: row.id,
      actorUserId: null,
      type: "quote.expired",
      summary: `Quote ${row.quoteNumber} expired after its validity date passed.`,
      metadata: {
        quoteNumber: row.quoteNumber,
      },
      createdAt: now,
      updatedAt: now,
    })),
  );

  return rows.length;
}

export async function syncExpiredQuotesForBusiness(businessId: string) {
  const today = getTodayUtcDateString();
  const rows = await db
    .select({
      id: quotes.id,
      businessId: quotes.businessId,
      inquiryId: quotes.inquiryId,
      quoteNumber: quotes.quoteNumber,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "sent"),
        isNull(quotes.deletedAt),
        lt(quotes.validUntil, today),
      ),
    );

  if (!rows.length) {
    return 0;
  }

  const count = await db.transaction((tx) => expireQuoteRows(tx, rows));

  // Emit quote.expired events after successful transaction
  for (const row of rows) {
    emitEvent(row.businessId, "quote.expired", {
      quoteId: row.id,
      expiredAt: new Date().toISOString(),
    });
  }

  return count;
}

/**
 * Sweep all sent quotes whose validity date has passed across every business.
 *
 * Called from the daily cron to keep automation triggers (`quote.expired`)
 * firing on time even when nobody opens the quote list. The per-business
 * helper still runs on read paths as a fast secondary reconciliation.
 *
 * Processed in batches to keep transactions bounded; iterates until no rows
 * remain so a one-off backlog after a cron outage still drains.
 */
export async function syncExpiredQuotesGlobal({
  batchSize = 200,
  maxBatches = 50,
}: {
  batchSize?: number;
  maxBatches?: number;
} = {}) {
  const today = getTodayUtcDateString();
  let totalExpired = 0;
  let batches = 0;

  while (batches < maxBatches) {
    const rows = await db
      .select({
        id: quotes.id,
        businessId: quotes.businessId,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.status, "sent"),
          isNull(quotes.deletedAt),
          lt(quotes.validUntil, today),
        ),
      )
      .limit(batchSize);

    if (rows.length === 0) {
      break;
    }

    await db.transaction((tx) => expireQuoteRows(tx, rows));

    const expiredAt = new Date().toISOString();
    for (const row of rows) {
      emitEvent(row.businessId, "quote.expired", {
        quoteId: row.id,
        expiredAt,
      });
    }

    totalExpired += rows.length;
    batches += 1;

    if (rows.length < batchSize) {
      break;
    }
  }

  return { expired: totalExpired, batches };
}

export async function syncExpiredQuoteForPublicToken(token: string) {
  const today = getTodayUtcDateString();
  const rows = await db
    .select({
      id: quotes.id,
      businessId: quotes.businessId,
      inquiryId: quotes.inquiryId,
      quoteNumber: quotes.quoteNumber,
    })
    .from(quotes)
    .where(
      and(
        getQuotePublicTokenLookupCondition(token),
        eq(quotes.status, "sent"),
        isNull(quotes.deletedAt),
        lt(quotes.validUntil, today),
      ),
    )
    .limit(1);

  if (!rows.length) {
    return 0;
  }

  const count = await db.transaction((tx) => expireQuoteRows(tx, rows));

  // Emit quote.expired event after successful transaction
  for (const row of rows) {
    emitEvent(row.businessId, "quote.expired", {
      quoteId: row.id,
      expiredAt: new Date().toISOString(),
    });
  }

  return count;
}

type CreateQuoteForBusinessInput = {
  businessId: string;
  actorUserId: string;
  currency: string;
  inquiryId?: string | null;
  quote: QuoteEditorInput;
};

export async function createQuoteForBusiness({
  businessId,
  actorUserId,
  currency,
  inquiryId = null,
  quote,
}: CreateQuoteForBusinessInput) {
  const quoteId = createId("qt");
  const totals = calculateQuoteTotals(quote);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await db.transaction(async (tx) => {
        const [business] = await tx
          .select({
            businessId: businesses.id,
          })
          .from(businesses)
          .where(eq(businesses.id, businessId))
          .limit(1);

        if (!business) {
          return null;
        }

        if (inquiryId) {
          const [inquiry] = await tx
            .select({ id: inquiries.id })
            .from(inquiries)
            .where(
              and(
                eq(inquiries.id, inquiryId),
                eq(inquiries.businessId, businessId),
              ),
            )
            .limit(1);

          if (!inquiry) {
            return null;
          }
        }

        const [latestQuote] = await tx
          .select({
            latestSequence: sql<number>`coalesce(max((nullif(substring(${quotes.quoteNumber} from '[0-9]+$'), ''))::integer), 0)`,
          })
          .from(quotes)
          .where(eq(quotes.businessId, businessId))
          .limit(1);
        const quoteNumber = getNextQuoteNumberFromSequence(
          latestQuote?.latestSequence,
        );
        const storedPublicToken = createStoredQuotePublicToken();
        const now = new Date();

        await tx.insert(quotes).values({
          id: quoteId,
          businessId,
          inquiryId,
          status: "draft",
          quoteNumber,
          publicToken: storedPublicToken.publicToken,
          publicTokenHash: storedPublicToken.publicTokenHash,
          title: quote.title,
          customerName: quote.customerName,
          customerEmail: quote.customerContactMethod === "email" ? quote.customerContactHandle : quote.customerEmail ?? null,
          customerContactMethod: quote.customerContactMethod,
          customerContactHandle: quote.customerContactHandle,
          currency,
          notes: quote.notes ?? null,
          terms: quote.terms ?? null,
          subtotalInCents: totals.subtotalInCents,
          discountInCents: totals.discountInCents,
          taxInCents: totals.taxInCents,
          taxLabel: quote.taxLabel?.trim() || null,
          totalInCents: totals.totalInCents,
          validUntil: quote.validUntil,
          createdAt: now,
          updatedAt: now,
        });

        await tx.insert(quoteItems).values(
          totals.items.map((item) => ({
            id: item.id,
            businessId,
            quoteId,
            description: item.description,
            quantity: item.quantity,
            unitPriceInCents: item.unitPriceInCents,
            lineTotalInCents: item.lineTotalInCents,
            position: item.position,
            createdAt: now,
            updatedAt: now,
          })),
        );

        await insertQuoteActivity(tx, {
          businessId,
          inquiryId,
          quoteId,
          actorUserId,
          type: "quote.created",
          summary: `Draft quote ${quoteNumber} created.`,
          metadata: {
            quoteNumber,
          },
          now,
        });

        await writeAuditLog(tx, {
          businessId,
          actorUserId,
          entityType: "quote",
          entityId: quoteId,
          action: "quote.created",
          metadata: {
            quoteNumber,
            title: quote.title,
            customerName: quote.customerName,
          },
          createdAt: now,
        });

        return {
          id: quoteId,
          quoteNumber,
        };
      });

      if (created) {
        // Emit automation event after the transaction commits so subscribers
        // see consistent state. emitEvent itself is non-blocking via after().
        emitEvent(businessId, "quote.created", {
          quoteId: created.id,
          inquiryId: inquiryId ?? "",
          amount: totals.totalInCents,
        });
      }

      return created;
    } catch (error) {
      if (attempt < 4 && isRetryableUniqueConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to allocate a unique quote number.");
}

type UpdateQuoteForBusinessInput = {
  businessId: string;
  quoteId: string;
  actorUserId: string;
  quote: QuoteEditorInput;
};

export async function updateQuoteForBusiness({
  businessId,
  quoteId,
  actorUserId,
  quote,
}: UpdateQuoteForBusinessInput) {
  const totals = calculateQuoteTotals(quote);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        status: quotes.status,
        quoteNumber: quotes.quoteNumber,
        currency: quotes.currency,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        archivedAt: quotes.archivedAt,
        deletedAt: quotes.deletedAt,
        businessId: businesses.id,
        title: quotes.title,
        customerName: quotes.customerName,
      })
      .from(quotes)
      .innerJoin(businesses, eq(quotes.businessId, businesses.id))
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote) {
      return null;
    }

    if (
      existingQuote.deletedAt ||
      existingQuote.archivedAt ||
      existingQuote.status !== "draft"
    ) {
      return {
        updated: false,
        locked: true,
        status: existingQuote.status,
      } as const;
    }

    await tx
      .update(quotes)
      .set({
        title: quote.title,
        customerName: quote.customerName,
        customerEmail: quote.customerContactMethod === "email" ? quote.customerContactHandle : quote.customerEmail ?? null,
        customerContactMethod: quote.customerContactMethod,
        customerContactHandle: quote.customerContactHandle,
        notes: quote.notes ?? null,
        terms: quote.terms ?? null,
        subtotalInCents: totals.subtotalInCents,
        discountInCents: totals.discountInCents,
        taxInCents: totals.taxInCents,
        taxLabel: quote.taxLabel?.trim() || null,
        totalInCents: totals.totalInCents,
        validUntil: quote.validUntil,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)));

    await tx
      .delete(quoteItems)
      .where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.businessId, businessId)));

    await tx.insert(quoteItems).values(
      totals.items.map((item) => ({
        id: item.id,
        businessId,
        quoteId,
        description: item.description,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        lineTotalInCents: item.lineTotalInCents,
        position: item.position,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.updated",
      summary: `Draft quote ${existingQuote.quoteNumber} updated.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
      },
      now,
    });

    return {
      updated: true,
      locked: false,
      status: existingQuote.status,
      currency: existingQuote.currency,
    } as const;
  });
}

type UpdateQuoteRecordStateForBusinessInput = {
  businessId: string;
  quoteId: string;
  actorUserId: string;
};

export async function deleteDraftQuoteForBusiness({
  businessId,
  quoteId,
  actorUserId,
}: UpdateQuoteRecordStateForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        validUntil: quotes.validUntil,
        archivedAt: quotes.archivedAt,
        deletedAt: quotes.deletedAt,
        businessId: businesses.id,
        title: quotes.title,
        customerName: quotes.customerName,
      })
      .from(quotes)
      .innerJoin(businesses, eq(quotes.businessId, businesses.id))
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote) {
      return null;
    }

    const effectiveStatus = getStoredEffectiveQuoteStatus(
      existingQuote.status,
      existingQuote.validUntil,
    );

    if (existingQuote.deletedAt) {
      return {
        deleted: false,
        locked: false,
        inquiryId: existingQuote.inquiryId,
        quoteNumber: existingQuote.quoteNumber,
        status: effectiveStatus,
      };
    }

    if (existingQuote.archivedAt || effectiveStatus !== "draft") {
      return {
        deleted: false,
        locked: true,
        lockedReason: existingQuote.archivedAt ? "archived" : "lifecycle",
        inquiryId: existingQuote.inquiryId,
        quoteNumber: existingQuote.quoteNumber,
        status: effectiveStatus,
      } as const;
    }

    await tx
      .update(quotes)
      .set({
        deletedAt: now,
        deletedBy: actorUserId,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)));

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.deleted_draft",
      summary: `Draft quote ${existingQuote.quoteNumber} deleted.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
      },
      now,
    });

    await writeAuditLog(tx, {
      businessId: existingQuote.businessId,
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote.draft_deleted",
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        title: existingQuote.title,
        customerName: existingQuote.customerName,
      },
      createdAt: now,
    });

    return {
      deleted: true,
      locked: false,
      inquiryId: existingQuote.inquiryId,
      quoteNumber: existingQuote.quoteNumber,
      status: effectiveStatus,
    } as const;
  });
}

export async function archiveQuoteForBusiness({
  businessId,
  quoteId,
  actorUserId,
}: UpdateQuoteRecordStateForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        validUntil: quotes.validUntil,
        archivedAt: quotes.archivedAt,
        deletedAt: quotes.deletedAt,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote || existingQuote.deletedAt) {
      return null;
    }

    const effectiveStatus = getStoredEffectiveQuoteStatus(
      existingQuote.status,
      existingQuote.validUntil,
    );

    if (effectiveStatus === "draft") {
      return {
        changed: false,
        locked: true,
        lockedReason: "draft",
        inquiryId: existingQuote.inquiryId,
        quoteNumber: existingQuote.quoteNumber,
        status: effectiveStatus,
      } as const;
    }

    if (existingQuote.archivedAt) {
      return {
        changed: false,
        locked: false,
        inquiryId: existingQuote.inquiryId,
        quoteNumber: existingQuote.quoteNumber,
        status: effectiveStatus,
      };
    }

    await tx
      .update(quotes)
      .set({
        archivedAt: now,
        archivedBy: actorUserId,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)));

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.archived",
      summary: `Quote ${existingQuote.quoteNumber} archived.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        status: effectiveStatus,
      },
      now,
    });

    return {
      changed: true,
      locked: false,
      inquiryId: existingQuote.inquiryId,
      quoteNumber: existingQuote.quoteNumber,
      status: effectiveStatus,
    };
  });
}

export async function restoreArchivedQuoteForBusiness({
  businessId,
  quoteId,
  actorUserId,
}: UpdateQuoteRecordStateForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        validUntil: quotes.validUntil,
        archivedAt: quotes.archivedAt,
        deletedAt: quotes.deletedAt,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote || existingQuote.deletedAt) {
      return null;
    }

    const effectiveStatus = getStoredEffectiveQuoteStatus(
      existingQuote.status,
      existingQuote.validUntil,
    );

    if (!existingQuote.archivedAt) {
      return {
        changed: false,
        locked: false,
        inquiryId: existingQuote.inquiryId,
        quoteNumber: existingQuote.quoteNumber,
        status: effectiveStatus,
      };
    }

    await tx
      .update(quotes)
      .set({
        archivedAt: null,
        archivedBy: null,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)));

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.unarchived",
      summary: `Quote ${existingQuote.quoteNumber} restored to active.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        status: effectiveStatus,
      },
      now,
    });

    return {
      changed: true,
      locked: false,
      inquiryId: existingQuote.inquiryId,
      quoteNumber: existingQuote.quoteNumber,
      status: effectiveStatus,
    };
  });
}

export async function voidQuoteForBusiness({
  businessId,
  quoteId,
  actorUserId,
}: UpdateQuoteRecordStateForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        validUntil: quotes.validUntil,
        archivedAt: quotes.archivedAt,
        deletedAt: quotes.deletedAt,
        sentAt: quotes.sentAt,
        businessId: businesses.id,
        title: quotes.title,
        customerName: quotes.customerName,
      })
      .from(quotes)
      .innerJoin(businesses, eq(quotes.businessId, businesses.id))
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote || existingQuote.deletedAt) {
      return null;
    }

    const effectiveStatus = getStoredEffectiveQuoteStatus(
      existingQuote.status,
      existingQuote.validUntil,
    );

    if (existingQuote.status === "sent" && effectiveStatus === "expired") {
      await expireQuoteRows(tx, [
        {
          id: existingQuote.id,
          businessId,
          inquiryId: existingQuote.inquiryId,
          quoteNumber: existingQuote.quoteNumber,
        },
      ]);
    }

    if (effectiveStatus === "voided") {
      return {
        changed: false,
        locked: false,
        inquiryId: existingQuote.inquiryId,
        quoteNumber: existingQuote.quoteNumber,
        status: effectiveStatus,
      };
    }

    if (effectiveStatus !== "sent") {
      return {
        changed: false,
        locked: true,
        inquiryId: existingQuote.inquiryId,
        quoteNumber: existingQuote.quoteNumber,
        status: effectiveStatus,
      } as const;
    }

    await tx
      .update(quotes)
      .set({
        status: "voided",
        voidedAt: now,
        voidedBy: actorUserId,
        acceptedAt: null,
        postAcceptanceStatus: "none",
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)));

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.voided",
      summary: `Quote ${existingQuote.quoteNumber} voided.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
      },
      now,
    });

    await writeAuditLog(tx, {
      businessId: existingQuote.businessId,
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote.voided",
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        title: existingQuote.title,
        customerName: existingQuote.customerName,
      },
      createdAt: now,
    });

    return {
      changed: true,
      locked: false,
      inquiryId: existingQuote.inquiryId,
      quoteNumber: existingQuote.quoteNumber,
      status: "voided" as const,
    };
  });
}

type MarkQuoteSentForBusinessInput = {
  businessId: string;
  quoteId: string;
  actorUserId: string;
  sendMethod?: QuoteDeliveryMethod;
};

export async function markQuoteSentForBusiness({
  businessId,
  quoteId,
  actorUserId,
  sendMethod = "requo",
}: MarkQuoteSentForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        publicToken: quotes.publicToken,
        status: quotes.status,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        archivedAt: quotes.archivedAt,
        deletedAt: quotes.deletedAt,
        businessId: businesses.id,
        title: quotes.title,
        customerName: quotes.customerName,
      })
      .from(quotes)
      .innerJoin(businesses, eq(quotes.businessId, businesses.id))
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote || existingQuote.deletedAt) {
      return null;
    }

    if (existingQuote.archivedAt || existingQuote.status !== "draft") {
      return {
        changed: false,
        status: existingQuote.status,
        quoteNumber: existingQuote.quoteNumber,
        inquiryId: existingQuote.inquiryId,
        publicToken: tryResolveStoredQuotePublicToken(existingQuote),
      };
    }

    await tx
      .update(quotes)
      .set({
        status: "sent",
        sentAt: now,
        acceptedAt: null,
        publicViewedAt: null,
        customerRespondedAt: null,
        customerResponseMessage: null,
        postAcceptanceStatus: "none",
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)));

    await maybeMoveInquiryToQuoted(tx, businessId, existingQuote.inquiryId, now);

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.sent",
      summary:
        sendMethod === "manual"
          ? `Quote ${existingQuote.quoteNumber} marked as sent after manual delivery.`
          : `Quote ${existingQuote.quoteNumber} sent with Requo email.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        sendMethod,
      },
      now,
    });

    await writeAuditLog(tx, {
      businessId: existingQuote.businessId,
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote.sent",
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        title: existingQuote.title,
        customerName: existingQuote.customerName,
        sendMethod,
      },
      createdAt: now,
    });

    return {
      changed: true,
      status: "sent" as const,
      quoteNumber: existingQuote.quoteNumber,
      inquiryId: existingQuote.inquiryId,
      publicToken: tryResolveStoredQuotePublicToken(existingQuote),
    };
  });
}

type LogQuoteSendEventInput = {
  businessId: string;
  quoteId: string;
  inquiryId: string | null;
  actorUserId: string;
  eventType: string;
  channel?: string;
};

const sendEventSummaries: Record<string, string> = {
  copied_link: "Quote link copied",
  copied_message: "Quote message copied",
  opened_email_app: "Email compose opened",
  copied_followup: "Follow-up message copied",
};

export async function logQuoteSendEvent({
  businessId,
  quoteId,
  inquiryId,
  actorUserId,
  eventType,
  channel,
}: LogQuoteSendEventInput) {
  const now = new Date();
  const channelLabel = channel ? ` via ${channel}` : "";
  const baseSummary =
    sendEventSummaries[eventType] ?? "Quote send action recorded";
  const summary = `${baseSummary}${channelLabel}.`;

  await db.transaction(async (tx) => {
    await insertQuoteActivity(tx, {
      businessId,
      inquiryId,
      quoteId,
      actorUserId,
      type: `quote.send.${eventType}`,
      summary,
      metadata: {
        eventType,
        ...(channel ? { channel } : {}),
      },
      now,
    });
  });
}

export async function recordQuotePublicViewAt(quoteId: string, businessId?: string) {
  const now = new Date();

  await db
    .update(quotes)
    .set({
      publicViewedAt: now,
      autoFollowUpStoppedAt: now,
    })
    .where(
      and(
        eq(quotes.id, quoteId),
        isNull(quotes.deletedAt),
        inArray(quotes.status, ["sent", "revision_requested", "accepted", "rejected", "expired", "voided"]),
      ),
    );

  // Emit quote.viewed event if businessId is available
  if (businessId) {
    emitEvent(businessId, "quote.viewed", {
      quoteId,
      viewedAt: now.toISOString(),
    });
  }

  return now;
}

type RespondToPublicQuoteByTokenInput = {
  token: string;
  response: "accepted" | "rejected";
  message?: string;
};

export async function respondToPublicQuoteByToken({
  token,
  response,
  message,
}: RespondToPublicQuoteByTokenInput) {
  const today = getTodayUtcDateString();
  const now = new Date();
  const nextStatus = response;

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        businessId: quotes.businessId,
        businessSlug: businesses.slug,
        businessName: businesses.name,
        businessPlan: businesses.plan,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        publicToken: quotes.publicToken,
        status: quotes.status,
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        totalInCents: quotes.totalInCents,
        notifyOnQuoteResponse: businesses.notifyOnQuoteResponse,
        notifyInAppOnQuoteResponse: businesses.notifyInAppOnQuoteResponse,
        notifyPushOnQuoteResponse: businesses.notifyPushOnQuoteResponse,
      })
      .from(quotes)
      .innerJoin(businesses, eq(quotes.businessId, businesses.id))
      .where(and(getQuotePublicTokenLookupCondition(token), isNull(quotes.deletedAt)))
      .limit(1);

    if (!existingQuote) {
      return null;
    }

    if (existingQuote.status === "sent" && existingQuote.validUntil < today) {
      await expireQuoteRows(tx, [
        {
          id: existingQuote.id,
          businessId: existingQuote.businessId,
          inquiryId: existingQuote.inquiryId,
          quoteNumber: existingQuote.quoteNumber,
        },
      ]);

      return {
        updated: false,
        businessId: existingQuote.businessId,
        inquiryId: existingQuote.inquiryId,
        quoteId: existingQuote.id,
        businessSlug: existingQuote.businessSlug,
        quoteNumber: existingQuote.quoteNumber,
        status: "expired" as const,
      };
    }

    if (existingQuote.status !== "sent") {
      /* Idempotency: if the quote is already accepted, return gracefully. */
      if (existingQuote.status === "accepted") {
        return {
          updated: false,
          businessId: existingQuote.businessId,
          inquiryId: existingQuote.inquiryId,
          quoteId: existingQuote.id,
          businessSlug: existingQuote.businessSlug,
          quoteNumber: existingQuote.quoteNumber,
          status: "accepted" as const,
        };
      }

      return {
        updated: false,
        businessId: existingQuote.businessId,
        inquiryId: existingQuote.inquiryId,
        quoteId: existingQuote.id,
        businessSlug: existingQuote.businessSlug,
        quoteNumber: existingQuote.quoteNumber,
        status: existingQuote.status,
      };
    }

    await tx
      .update(quotes)
      .set({
        status: nextStatus,
        sentAt: existingQuote.sentAt ?? now,
        acceptedAt: nextStatus === "accepted" ? now : null,
        customerRespondedAt: now,
        customerResponseMessage: message?.trim() || null,
        postAcceptanceStatus:
          nextStatus === "accepted"
            ? existingQuote.postAcceptanceStatus
            : "none",
        autoFollowUpStoppedAt: now,
        updatedAt: now,
      })
      .where(eq(quotes.id, existingQuote.id));

    if (nextStatus === "accepted") {
      await maybeMoveInquiryToWon(
        tx,
        existingQuote.businessId,
        existingQuote.inquiryId,
        now,
      );

      await onQuoteAccepted(
        tx,
        existingQuote.businessId,
        existingQuote.id,
        existingQuote.inquiryId,
        existingQuote.quoteNumber,
        now,
      );
    }

    await insertQuoteActivity(tx, {
      businessId: existingQuote.businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId: existingQuote.id,
      actorUserId: null,
      type:
        nextStatus === "accepted"
          ? "quote.customer_accepted"
          : "quote.customer_rejected",
      summary:
        nextStatus === "accepted"
          ? `Customer accepted quote ${existingQuote.quoteNumber}.`
          : `Customer declined quote ${existingQuote.quoteNumber}.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        response: nextStatus,
        customerMessage: message?.trim() || null,
      },
      now,
    });

    if (existingQuote.notifyInAppOnQuoteResponse) {
      await insertBusinessNotification(tx, {
        businessId: existingQuote.businessId,
        inquiryId: existingQuote.inquiryId,
        quoteId: existingQuote.id,
        type:
          nextStatus === "accepted"
            ? "quote_customer_accepted"
            : "quote_customer_rejected",
        title:
          nextStatus === "accepted"
            ? `${existingQuote.customerName} accepted ${existingQuote.quoteNumber}`
            : `${existingQuote.customerName} declined ${existingQuote.quoteNumber}`,
        summary: truncateNotificationMessage(message, 140) ?? existingQuote.title,
        metadata: {
          customerEmail: existingQuote.customerEmail,
          customerMessage: message?.trim() || null,
          customerName: existingQuote.customerName,
          quoteNumber: existingQuote.quoteNumber,
          response: nextStatus,
          title: existingQuote.title,
        },
        now,
      });
    }

    // Auto-close pending follow-ups for this quote when customer responds
    // Note: This is called inside the transaction but uses its own nested transaction (savepoint).
    // This is intentional — if auto-close fails, the quote response should still succeed.
    try {
      await autoCloseFollowUpsForQuote({
        businessId: existingQuote.businessId,
        quoteId: existingQuote.id,
        reason: nextStatus === "accepted" ? "quote_accepted" : "quote_rejected",
      });
    } catch (error) {
      // Non-critical: log but don't fail the quote response
      console.error("[respondToPublicQuoteByToken] Failed to auto-close follow-ups", error);
    }

    return {
      updated: true,
      businessId: existingQuote.businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId: existingQuote.id,
      businessSlug: existingQuote.businessSlug,
      businessPlan: existingQuote.businessPlan,
      businessName: existingQuote.businessName,
      customerName: existingQuote.customerName,
      customerEmail: existingQuote.customerEmail,
      customerResponseMessage: message?.trim() || null,
      notifyOnQuoteResponse: existingQuote.notifyOnQuoteResponse,
      notifyPushOnQuoteResponse: existingQuote.notifyPushOnQuoteResponse,
      publicToken: tryResolveStoredQuotePublicToken(existingQuote),
      quoteNumber: existingQuote.quoteNumber,
      status: nextStatus,
      title: existingQuote.title,
      totalInCents: existingQuote.totalInCents,
      updatedAt: now,
    };
  });
}

const defaultPostWinChecklistLabels = [
  "Contact customer",
  "Confirm schedule",
  "Request deposit/payment",
  "Prepare work details",
  "Mark work completed",
];

async function maybeCreatePostWinChecklist(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  businessId: string,
  quoteId: string,
  now: Date,
) {
  const [existing] = await tx
    .select({ id: postWinChecklistItems.id })
    .from(postWinChecklistItems)
    .where(eq(postWinChecklistItems.quoteId, quoteId))
    .limit(1);

  if (existing) {
    return false;
  }

  await tx.insert(postWinChecklistItems).values(
    defaultPostWinChecklistLabels.map((label, index) => ({
      id: createId("pwc"),
      businessId,
      quoteId,
      label,
      position: index,
      createdAt: now,
      updatedAt: now,
    })),
  );

  return true;
}

async function maybeSkipSalesFollowUps(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  businessId: string,
  quoteId: string,
  now: Date,
) {
  const pendingSalesFollowUps = await tx
    .select({ id: followUps.id, title: followUps.title })
    .from(followUps)
    .where(
      and(
        eq(followUps.businessId, businessId),
        eq(followUps.quoteId, quoteId),
        eq(followUps.status, "pending"),
        eq(followUps.category, "sales"),
      ),
    );

  if (!pendingSalesFollowUps.length) {
    return 0;
  }

  await tx
    .update(followUps)
    .set({
      status: "skipped",
      skippedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(followUps.businessId, businessId),
        eq(followUps.quoteId, quoteId),
        eq(followUps.status, "pending"),
        eq(followUps.category, "sales"),
      ),
    );

  return pendingSalesFollowUps.length;
}

export async function onQuoteAccepted(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  businessId: string,
  quoteId: string,
  inquiryId: string | null,
  quoteNumber: string,
  now: Date,
) {
  // Auto-create job if the business has it enabled
  const [business] = await tx
    .select({ autoCreateJobsOnAcceptance: businesses.autoCreateJobsOnAcceptance })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (business?.autoCreateJobsOnAcceptance) {
    const { createJobFromQuoteForBusiness } = await import("@/features/jobs/mutations");
    await createJobFromQuoteForBusiness({
      businessId,
      quoteId,
      userId: null,
      tx,
    });
  }

  const checklistCreated = await maybeCreatePostWinChecklist(
    tx,
    businessId,
    quoteId,
    now,
  );

  if (checklistCreated) {
    await insertQuoteActivity(tx, {
      businessId,
      inquiryId,
      quoteId,
      type: "quote.post_win_checklist_created",
      summary: `Post-win checklist created for quote ${quoteNumber}.`,
      metadata: { quoteNumber },
      now,
    });
  }

  const skippedCount = await maybeSkipSalesFollowUps(
    tx,
    businessId,
    quoteId,
    now,
  );

  if (skippedCount > 0) {
    await insertQuoteActivity(tx, {
      businessId,
      inquiryId,
      quoteId,
      type: "follow_up.auto_skipped_on_acceptance",
      summary: `${skippedCount} sales follow-up${skippedCount > 1 ? "s" : ""} skipped after customer accepted.`,
      metadata: { quoteNumber, skippedCount },
      now,
    });
  }
}

type UpdateQuotePostAcceptanceStatusForBusinessInput = {
  businessId: string;
  quoteId: string;
  actorUserId: string;
  postAcceptanceStatus: import("@/features/quotes/types").QuotePostAcceptanceStatus;
};

export async function updateQuotePostAcceptanceStatusForBusiness({
  businessId,
  quoteId,
  actorUserId,
  postAcceptanceStatus,
}: UpdateQuotePostAcceptanceStatusForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        deletedAt: quotes.deletedAt,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote || existingQuote.deletedAt) {
      return null;
    }

    if (existingQuote.status !== "accepted") {
      return {
        updated: false,
        locked: true,
        inquiryId: existingQuote.inquiryId,
        quoteNumber: existingQuote.quoteNumber,
        postAcceptanceStatus: existingQuote.postAcceptanceStatus,
      } as const;
    }

    if (existingQuote.postAcceptanceStatus === postAcceptanceStatus) {
      return {
        updated: false,
        locked: false,
        inquiryId: existingQuote.inquiryId,
        quoteNumber: existingQuote.quoteNumber,
        postAcceptanceStatus,
      } as const;
    }

    await tx
      .update(quotes)
      .set({
        postAcceptanceStatus,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)));

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.post_acceptance_updated",
      summary:
        postAcceptanceStatus === "none"
          ? `Post-acceptance status cleared for quote ${existingQuote.quoteNumber}.`
          : `Quote ${existingQuote.quoteNumber} marked ${postAcceptanceStatus}.`,
      metadata: {
        previousPostAcceptanceStatus: existingQuote.postAcceptanceStatus,
        postAcceptanceStatus,
        quoteNumber: existingQuote.quoteNumber,
      },
      now,
    });

    return {
      updated: true,
      locked: false,
      inquiryId: existingQuote.inquiryId,
      quoteNumber: existingQuote.quoteNumber,
      postAcceptanceStatus,
    } as const;
  });
}

type CancelAcceptedQuoteForBusinessInput = {
  businessId: string;
  quoteId: string;
  actorUserId: string;
  cancellationReason: string;
  cancellationNote?: string;
};

export async function cancelAcceptedQuoteForBusiness({
  businessId,
  quoteId,
  actorUserId,
  cancellationReason,
  cancellationNote,
}: CancelAcceptedQuoteForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        deletedAt: quotes.deletedAt,
        businessId: businesses.id,
        title: quotes.title,
        customerName: quotes.customerName,
        totalInCents: quotes.totalInCents,
        currency: quotes.currency,
      })
      .from(quotes)
      .innerJoin(businesses, eq(quotes.businessId, businesses.id))
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote || existingQuote.deletedAt) {
      return null;
    }

    if (existingQuote.status !== "accepted") {
      return {
        updated: false,
        locked: true,
        reason: "not_accepted",
        quoteNumber: existingQuote.quoteNumber,
      } as const;
    }

    if (existingQuote.postAcceptanceStatus === "completed") {
      return {
        updated: false,
        locked: true,
        reason: "already_completed",
        quoteNumber: existingQuote.quoteNumber,
      } as const;
    }

    if (existingQuote.postAcceptanceStatus === "canceled") {
      return {
        updated: false,
        locked: false,
        reason: "already_canceled",
        quoteNumber: existingQuote.quoteNumber,
      } as const;
    }

    /* Quote status stays 'accepted' — postAcceptanceStatus tracks cancellation. */
    await tx
      .update(quotes)
      .set({
        postAcceptanceStatus: "canceled",
        canceledAt: now,
        canceledBy: actorUserId,
        cancellationReason,
        cancellationNote: cancellationNote?.trim() || null,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)));

    /* Move inquiry to lost. */
    if (existingQuote.inquiryId) {
      await tx
        .update(inquiries)
        .set({
          status: "lost",
          updatedAt: now,
        })
        .where(
          and(
            eq(inquiries.id, existingQuote.inquiryId),
            eq(inquiries.businessId, businessId),
            eq(inquiries.status, "won"),
          ),
        );
    }

    /* Skip pending post-win follow-ups. */
    await tx
      .update(followUps)
      .set({
        status: "skipped",
        skippedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(followUps.businessId, businessId),
          eq(followUps.quoteId, quoteId),
          eq(followUps.status, "pending"),
          eq(followUps.category, "post_win"),
        ),
      );

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.canceled_after_acceptance",
      summary: `Accepted quote ${existingQuote.quoteNumber} canceled: ${cancellationReason.replace(/_/g, " ")}.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        cancellationReason,
        cancellationNote: cancellationNote?.trim() || null,
      },
      now,
    });

    await writeAuditLog(tx, {
      businessId: existingQuote.businessId,
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote.canceled_after_acceptance",
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        title: existingQuote.title,
        customerName: existingQuote.customerName,
        cancellationReason,
      },
      createdAt: now,
    });

    return {
      updated: true,
      locked: false,
      inquiryId: existingQuote.inquiryId,
      quoteNumber: existingQuote.quoteNumber,
      postAcceptanceStatus: "canceled" as const,
    };
  });
}

type CompleteAcceptedQuoteForBusinessInput = {
  businessId: string;
  quoteId: string;
  actorUserId: string;
};

export async function completeAcceptedQuoteForBusiness({
  businessId,
  quoteId,
  actorUserId,
}: CompleteAcceptedQuoteForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        deletedAt: quotes.deletedAt,
        businessId: businesses.id,
        title: quotes.title,
        customerName: quotes.customerName,
        totalInCents: quotes.totalInCents,
        currency: quotes.currency,
      })
      .from(quotes)
      .innerJoin(businesses, eq(quotes.businessId, businesses.id))
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote || existingQuote.deletedAt) {
      return null;
    }

    if (existingQuote.status !== "accepted") {
      return {
        updated: false,
        locked: true,
        reason: "not_accepted",
        quoteNumber: existingQuote.quoteNumber,
      } as const;
    }

    if (existingQuote.postAcceptanceStatus === "canceled") {
      return {
        updated: false,
        locked: true,
        reason: "already_canceled",
        quoteNumber: existingQuote.quoteNumber,
      } as const;
    }

    if (existingQuote.postAcceptanceStatus === "completed") {
      return {
        updated: false,
        locked: false,
        reason: "already_completed",
        quoteNumber: existingQuote.quoteNumber,
      } as const;
    }

    await tx
      .update(quotes)
      .set({
        postAcceptanceStatus: "completed",
        completedAt: now,
        completedBy: actorUserId,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)));

    /* Complete pending post-win follow-ups. */
    await tx
      .update(followUps)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(followUps.businessId, businessId),
          eq(followUps.quoteId, quoteId),
          eq(followUps.status, "pending"),
          eq(followUps.category, "post_win"),
        ),
      );

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.work_completed",
      summary: `Work completed for quote ${existingQuote.quoteNumber}.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
      },
      now,
    });

    await writeAuditLog(tx, {
      businessId: existingQuote.businessId,
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote.work_completed",
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
        title: existingQuote.title,
        customerName: existingQuote.customerName,
      },
      createdAt: now,
    });

    return {
      updated: true,
      locked: false,
      inquiryId: existingQuote.inquiryId,
      quoteNumber: existingQuote.quoteNumber,
      postAcceptanceStatus: "completed" as const,
    };
  });
}

type TogglePostWinChecklistItemInput = {
  businessId: string;
  quoteId: string;
  checklistItemId: string;
  actorUserId: string;
};

export async function togglePostWinChecklistItem({
  businessId,
  quoteId,
  checklistItemId,
  actorUserId,
}: TogglePostWinChecklistItemInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [item] = await tx
      .select({
        id: postWinChecklistItems.id,
        label: postWinChecklistItems.label,
        completedAt: postWinChecklistItems.completedAt,
      })
      .from(postWinChecklistItems)
      .where(
        and(
          eq(postWinChecklistItems.id, checklistItemId),
          eq(postWinChecklistItems.quoteId, quoteId),
          eq(postWinChecklistItems.businessId, businessId),
        ),
      )
      .limit(1);

    if (!item) {
      return null;
    }

    const isCompleting = !item.completedAt;

    await tx
      .update(postWinChecklistItems)
      .set({
        completedAt: isCompleting ? now : null,
        updatedAt: now,
      })
      .where(eq(postWinChecklistItems.id, checklistItemId));

    const [quote] = await tx
      .select({
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (quote) {
      await insertQuoteActivity(tx, {
        businessId,
        inquiryId: quote.inquiryId,
        quoteId,
        actorUserId,
        type: isCompleting
          ? "quote.post_win_checklist_item_completed"
          : "quote.post_win_checklist_item_unchecked",
        summary: isCompleting
          ? `Checklist item completed: ${item.label}.`
          : `Checklist item unchecked: ${item.label}.`,
        metadata: {
          checklistItemId,
          label: item.label,
          quoteNumber: quote.quoteNumber,
        },
        now,
      });
    }

    return {
      toggled: true,
      isCompleted: isCompleting,
      checklistItemId,
      label: item.label,
    };
  });
}

type CreatePostWinChecklistItemInput = {
  businessId: string;
  quoteId: string;
  actorUserId: string;
  label: string;
};

export async function createPostWinChecklistItem({
  businessId,
  quoteId,
  actorUserId: _actorUserId,
  label,
}: CreatePostWinChecklistItemInput) {
  const now = new Date();
  const itemId = createId("pwc");

  return db.transaction(async (tx) => {
    const [quote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        deletedAt: quotes.deletedAt,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!quote || quote.deletedAt || quote.status !== "accepted") {
      return null;
    }

    /* Find the next available position. */
    const [maxPos] = await tx
      .select({
        maxPosition: sql<number>`coalesce(max(${postWinChecklistItems.position}), -1)`,
      })
      .from(postWinChecklistItems)
      .where(eq(postWinChecklistItems.quoteId, quoteId));

    const nextPosition = (maxPos?.maxPosition ?? -1) + 1;

    await tx.insert(postWinChecklistItems).values({
      id: itemId,
      businessId,
      quoteId,
      label: label.trim(),
      position: nextPosition,
      createdAt: now,
      updatedAt: now,
    });

    return {
      created: true,
      checklistItemId: itemId,
      label: label.trim(),
      position: nextPosition,
    };
  });
}

// ---------------------------------------------------------------------------
// Quote Revision Requests
// ---------------------------------------------------------------------------

import { quoteVersions, quoteRevisionRequests } from "@/lib/db/schema/quotes";
import type { PublicQuoteRevisionRequestInput } from "@/features/quotes/schemas";
import { asc } from "drizzle-orm";

type RequestQuoteRevisionByTokenInput = {
  token: string;
  message?: string;
  itemComments?: Array<{
    itemId: string;
    itemDescription: string;
    comment: string;
  }>;
};

export async function requestQuoteRevisionByToken({
  token,
  message,
  itemComments = [],
}: RequestQuoteRevisionByTokenInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        businessId: quotes.businessId,
        businessSlug: businesses.slug,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        version: quotes.version,
        validUntil: quotes.validUntil,
        customerName: quotes.customerName,
        inquiryId: quotes.inquiryId,
        deletedAt: quotes.deletedAt,
        businessPlan: businesses.plan,
        notifyOnQuoteResponse: businesses.notifyOnQuoteResponse,
        notifyInAppOnQuoteResponse: businesses.notifyInAppOnQuoteResponse,
        notifyPushOnQuoteResponse: businesses.notifyPushOnQuoteResponse,
      })
      .from(quotes)
      .innerJoin(businesses, eq(quotes.businessId, businesses.id))
      .where(
        and(
          getQuotePublicTokenLookupCondition(token),
          isNull(quotes.deletedAt),
          isNull(businesses.deletedAt),
        ),
      )
      .limit(1);

    if (!existingQuote) {
      return null;
    }

    // Only allow revision requests on sent or revision_requested quotes
    if (existingQuote.status !== "sent" && existingQuote.status !== "revision_requested") {
      return {
        updated: false,
        status: existingQuote.status,
        quoteNumber: existingQuote.quoteNumber,
        businessId: existingQuote.businessId,
        businessSlug: existingQuote.businessSlug,
        quoteId: existingQuote.id,
        inquiryId: existingQuote.inquiryId,
        customerName: existingQuote.customerName,
        businessPlan: existingQuote.businessPlan,
        notifyPushOnQuoteResponse: existingQuote.notifyPushOnQuoteResponse,
      };
    }

    // Create the revision request
    const revisionId = createId("rev");
    await tx.insert(quoteRevisionRequests).values({
      id: revisionId,
      businessId: existingQuote.businessId,
      quoteId: existingQuote.id,
      version: existingQuote.version,
      message: message?.trim() || null,
      itemComments: itemComments.length > 0 ? itemComments : [],
      status: "pending",
      createdAt: now,
    });

    // Update quote status to revision_requested
    await tx
      .update(quotes)
      .set({
        status: "revision_requested",
        updatedAt: now,
      })
      .where(eq(quotes.id, existingQuote.id));

    // Log activity
    await insertQuoteActivity(tx, {
      businessId: existingQuote.businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId: existingQuote.id,
      actorUserId: null,
      type: "quote.revision_requested",
      summary: `${existingQuote.customerName} requested changes to quote ${existingQuote.quoteNumber}.`,
      metadata: {
        version: existingQuote.version,
        hasMessage: Boolean(message?.trim()),
        itemCommentCount: itemComments.length,
      },
      now,
    });

    // Create in-app notification
    if (existingQuote.notifyInAppOnQuoteResponse) {
      await insertBusinessNotification(tx, {
        businessId: existingQuote.businessId,
        quoteId: existingQuote.id,
        type: "quote_revision_requested",
        title: "Revision requested",
        summary: `${existingQuote.customerName} requested changes to ${existingQuote.quoteNumber}.`,
        metadata: {
          quoteNumber: existingQuote.quoteNumber,
          customerName: existingQuote.customerName,
          message: truncateNotificationMessage(message),
        },
        now,
      });
    }

    return {
      updated: true,
      status: "revision_requested" as const,
      quoteNumber: existingQuote.quoteNumber,
      businessId: existingQuote.businessId,
      businessSlug: existingQuote.businessSlug,
      quoteId: existingQuote.id,
      inquiryId: existingQuote.inquiryId,
      customerName: existingQuote.customerName,
      businessPlan: existingQuote.businessPlan,
      notifyPushOnQuoteResponse: existingQuote.notifyPushOnQuoteResponse,
    };
  });
}

/**
 * Archives the current quote state as a version snapshot, bumps the version,
 * and resets the status to draft so the owner can edit and re-send.
 */
type ArchiveQuoteVersionAndReviseInput = {
  businessId: string;
  quoteId: string;
  actorUserId: string;
};

export async function archiveQuoteVersionAndRevise({
  businessId,
  quoteId,
  actorUserId,
}: ArchiveQuoteVersionAndReviseInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        version: quotes.version,
        status: quotes.status,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        customerContactMethod: quotes.customerContactMethod,
        customerContactHandle: quotes.customerContactHandle,
        currency: quotes.currency,
        notes: quotes.notes,
        terms: quotes.terms,
        subtotalInCents: quotes.subtotalInCents,
        discountInCents: quotes.discountInCents,
        totalInCents: quotes.totalInCents,
        validUntil: quotes.validUntil,
        archivedAt: quotes.archivedAt,
        deletedAt: quotes.deletedAt,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!existingQuote || existingQuote.deletedAt || existingQuote.archivedAt) {
      return null;
    }

    // Only revision_requested or sent quotes can be revised
    if (existingQuote.status !== "revision_requested" && existingQuote.status !== "sent") {
      return {
        revised: false,
        locked: true,
        status: existingQuote.status,
      } as const;
    }

    // Get current items to archive
    const currentItems = await tx
      .select({
        id: quoteItems.id,
        description: quoteItems.description,
        quantity: quoteItems.quantity,
        unitPriceInCents: quoteItems.unitPriceInCents,
        lineTotalInCents: quoteItems.lineTotalInCents,
        position: quoteItems.position,
      })
      .from(quoteItems)
      .where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.businessId, businessId)))
      .orderBy(asc(quoteItems.position));

    // Archive current version
    await tx.insert(quoteVersions).values({
      id: createId("qv"),
      businessId,
      quoteId,
      version: existingQuote.version,
      title: existingQuote.title,
      customerName: existingQuote.customerName,
      customerEmail: existingQuote.customerEmail,
      customerContactMethod: existingQuote.customerContactMethod,
      customerContactHandle: existingQuote.customerContactHandle,
      currency: existingQuote.currency,
      notes: existingQuote.notes,
      terms: existingQuote.terms,
      subtotalInCents: existingQuote.subtotalInCents,
      discountInCents: existingQuote.discountInCents,
      totalInCents: existingQuote.totalInCents,
      validUntil: existingQuote.validUntil,
      items: currentItems,
      createdAt: now,
      archivedAt: now,
    });

    // Resolve any pending revision requests
    await tx
      .update(quoteRevisionRequests)
      .set({ status: "resolved", resolvedAt: now })
      .where(
        and(
          eq(quoteRevisionRequests.quoteId, quoteId),
          eq(quoteRevisionRequests.status, "pending"),
        ),
      );

    // Bump version and reset to draft
    const nextVersion = existingQuote.version + 1;
    await tx
      .update(quotes)
      .set({
        version: nextVersion,
        status: "draft",
        sentAt: null,
        acceptedAt: null,
        customerRespondedAt: null,
        customerResponseMessage: null,
        publicViewedAt: null,
        updatedAt: now,
      })
      .where(eq(quotes.id, quoteId));

    await insertQuoteActivity(tx, {
      businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.revised",
      summary: `Quote ${existingQuote.quoteNumber} moved to v${nextVersion} for revision.`,
      metadata: {
        previousVersion: existingQuote.version,
        newVersion: nextVersion,
      },
      now,
    });

    return {
      revised: true,
      locked: false,
      status: "draft" as const,
      previousVersion: existingQuote.version,
      newVersion: nextVersion,
      inquiryId: existingQuote.inquiryId,
      quoteNumber: existingQuote.quoteNumber,
    };
  });
}

// ---------------------------------------------------------------------------
// Auto follow-up management
// ---------------------------------------------------------------------------

type EnableAutoFollowUpInput = {
  quoteId: string;
  delayDays: number;
  maxAttempts: number;
};

export async function enableAutoFollowUpForQuote({
  quoteId,
  delayDays,
  maxAttempts,
}: EnableAutoFollowUpInput) {
  const now = new Date();

  await db
    .update(quotes)
    .set({
      autoFollowUpEnabled: true,
      autoFollowUpDelayDays: delayDays,
      autoFollowUpMaxAttempts: maxAttempts,
      autoFollowUpAttempts: 0,
      autoFollowUpLastSentAt: null,
      autoFollowUpStoppedAt: null,
      updatedAt: now,
    })
    .where(eq(quotes.id, quoteId));
}

export async function stopAutoFollowUpForQuote(quoteId: string) {
  const now = new Date();

  await db
    .update(quotes)
    .set({
      autoFollowUpStoppedAt: now,
      updatedAt: now,
    })
    .where(eq(quotes.id, quoteId));
}

// ---------------------------------------------------------------------------
// Bulk mutations for quote list actions
// ---------------------------------------------------------------------------

export async function bulkArchiveQuotesForBusiness({
  businessId,
  quoteIds,
  actorUserId,
}: {
  businessId: string;
  quoteIds: string[];
  actorUserId: string;
}): Promise<{ affected: number; skipped: number }> {
  const now = new Date();

  const result = await db
    .update(quotes)
    .set({
      archivedAt: now,
      archivedBy: actorUserId,
      updatedAt: now,
    })
    .where(
      and(
        eq(quotes.businessId, businessId),
        inArray(quotes.id, quoteIds),
        isNull(quotes.deletedAt),
      ),
    )
    .returning({ id: quotes.id });

  return {
    affected: result.length,
    skipped: quoteIds.length - result.length,
  };
}

export async function bulkVoidQuotesForBusiness({
  businessId,
  quoteIds,
  actorUserId,
}: {
  businessId: string;
  quoteIds: string[];
  actorUserId: string;
}): Promise<{ affected: number; skipped: number }> {
  const now = new Date();

  // Only "sent" quotes can be voided
  const result = await db
    .update(quotes)
    .set({
      status: "voided",
      voidedAt: now,
      voidedBy: actorUserId,
      updatedAt: now,
    })
    .where(
      and(
        eq(quotes.businessId, businessId),
        inArray(quotes.id, quoteIds),
        eq(quotes.status, "sent"),
        isNull(quotes.deletedAt),
      ),
    )
    .returning({ id: quotes.id });

  return {
    affected: result.length,
    skipped: quoteIds.length - result.length,
  };
}

export async function bulkDeleteDraftQuotesForBusiness({
  businessId,
  quoteIds,
  actorUserId,
}: {
  businessId: string;
  quoteIds: string[];
  actorUserId: string;
}): Promise<{ affected: number; skipped: number }> {
  const now = new Date();

  // Only draft, non-archived quotes can be deleted
  const result = await db
    .update(quotes)
    .set({
      deletedAt: now,
      deletedBy: actorUserId,
      updatedAt: now,
    })
    .where(
      and(
        eq(quotes.businessId, businessId),
        inArray(quotes.id, quoteIds),
        eq(quotes.status, "draft"),
        isNull(quotes.archivedAt),
        isNull(quotes.deletedAt),
      ),
    )
    .returning({ id: quotes.id });

  return {
    affected: result.length,
    skipped: quoteIds.length - result.length,
  };
}
