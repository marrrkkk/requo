import "server-only";

import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { writeAuditLog } from "@/features/audit/mutations";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
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
  resolveStoredQuotePublicToken,
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
  const totalInCents = subtotalInCents - input.discountInCents;

  return {
    items,
    subtotalInCents,
    discountInCents: input.discountInCents,
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
        isNull(inquiries.deletedAt),
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
        isNull(inquiries.deletedAt),
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

  return db.transaction((tx) => expireQuoteRows(tx, rows));
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

  return db.transaction((tx) => expireQuoteRows(tx, rows));
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
      return await db.transaction(async (tx) => {
        const [business] = await tx
          .select({
            workspaceId: businesses.workspaceId,
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
                isNull(inquiries.deletedAt),
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
          publicToken: null,
          publicTokenHash: storedPublicToken.publicTokenHash,
          publicTokenEncrypted: storedPublicToken.publicTokenEncrypted,
          title: quote.title,
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          currency,
          notes: quote.notes ?? null,
          subtotalInCents: totals.subtotalInCents,
          discountInCents: totals.discountInCents,
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
          workspaceId: business.workspaceId,
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
        workspaceId: businesses.workspaceId,
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
        customerEmail: quote.customerEmail,
        notes: quote.notes ?? null,
        subtotalInCents: totals.subtotalInCents,
        discountInCents: totals.discountInCents,
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
        workspaceId: businesses.workspaceId,
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
      workspaceId: existingQuote.workspaceId,
      businessId,
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
        workspaceId: businesses.workspaceId,
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
      workspaceId: existingQuote.workspaceId,
      businessId,
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
        publicTokenEncrypted: quotes.publicTokenEncrypted,
        status: quotes.status,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        archivedAt: quotes.archivedAt,
        deletedAt: quotes.deletedAt,
        workspaceId: businesses.workspaceId,
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
        publicToken: resolveStoredQuotePublicToken(existingQuote),
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
      workspaceId: existingQuote.workspaceId,
      businessId,
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
      publicToken: resolveStoredQuotePublicToken(existingQuote),
    };
  });
}

export async function recordQuotePublicViewAt(quoteId: string) {
  const now = new Date();

  await db
    .update(quotes)
    .set({
      publicViewedAt: now,
    })
    .where(
      and(
        eq(quotes.id, quoteId),
        isNull(quotes.deletedAt),
        inArray(quotes.status, ["sent", "accepted", "rejected", "expired", "voided"]),
      ),
    );

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
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        publicToken: quotes.publicToken,
        publicTokenEncrypted: quotes.publicTokenEncrypted,
        status: quotes.status,
        validUntil: quotes.validUntil,
        sentAt: quotes.sentAt,
        postAcceptanceStatus: quotes.postAcceptanceStatus,
        notifyOnQuoteResponse: businesses.notifyOnQuoteResponse,
        notifyInAppOnQuoteResponse: businesses.notifyInAppOnQuoteResponse,
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

    return {
      updated: true,
      businessId: existingQuote.businessId,
      inquiryId: existingQuote.inquiryId,
      quoteId: existingQuote.id,
      businessSlug: existingQuote.businessSlug,
      businessName: existingQuote.businessName,
      customerName: existingQuote.customerName,
      customerEmail: existingQuote.customerEmail,
      customerResponseMessage: message?.trim() || null,
      notifyOnQuoteResponse: existingQuote.notifyOnQuoteResponse,
      publicToken: resolveStoredQuotePublicToken(existingQuote),
      quoteNumber: existingQuote.quoteNumber,
      status: nextStatus,
      title: existingQuote.title,
      updatedAt: now,
    };
  });
}

type UpdateQuotePostAcceptanceStatusForBusinessInput = {
  businessId: string;
  quoteId: string;
  actorUserId: string;
  postAcceptanceStatus: "none" | "booked" | "scheduled";
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
