import "server-only";

import { and, desc, eq, inArray, lt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
  quoteItems,
  quotes,
  workspaces,
} from "@/lib/db/schema";
import type { QuoteEditorInput } from "@/features/quotes/schemas";
import type { QuoteStatus } from "@/features/quotes/types";
import {
  createQuotePublicToken,
  getQuoteStatusLabel,
  getTodayUtcDateString,
} from "@/features/quotes/utils";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function getNextQuoteNumberFromCurrent(currentQuoteNumber: string | null | undefined) {
  if (!currentQuoteNumber) {
    return "Q-0001";
  }

  const match = currentQuoteNumber.match(/(\d+)$/);
  const sequence = match ? Number.parseInt(match[1], 10) : 0;

  return `Q-${String(sequence + 1).padStart(4, "0")}`;
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
      (error.constraint_name === "quotes_workspace_quote_number_unique" ||
        error.constraint_name === "quotes_public_token_unique")) ||
      ("constraint" in error &&
        (error.constraint === "quotes_workspace_quote_number_unique" ||
          error.constraint === "quotes_public_token_unique")))
  );
}

async function maybeMoveInquiryToQuoted(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  workspaceId: string,
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
        eq(inquiries.workspaceId, workspaceId),
        inArray(inquiries.status, ["new", "waiting"]),
      ),
    )
    .returning({ id: inquiries.id });

  return Boolean(updatedInquiry);
}

async function maybeMoveInquiryToWon(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  workspaceId: string,
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
        eq(inquiries.workspaceId, workspaceId),
        inArray(inquiries.status, ["new", "quoted", "waiting"]),
      ),
    )
    .returning({ id: inquiries.id });

  return Boolean(updatedInquiry);
}

async function insertQuoteActivity(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  {
    workspaceId,
    inquiryId,
    quoteId,
    actorUserId,
    type,
    summary,
    metadata,
    now,
  }: {
    workspaceId: string;
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
    workspaceId,
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
    workspaceId: string;
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
      workspaceId: row.workspaceId,
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

export async function syncExpiredQuotesForWorkspace(workspaceId: string) {
  const today = getTodayUtcDateString();
  const rows = await db
    .select({
      id: quotes.id,
      workspaceId: quotes.workspaceId,
      inquiryId: quotes.inquiryId,
      quoteNumber: quotes.quoteNumber,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.workspaceId, workspaceId),
        eq(quotes.status, "sent"),
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
      workspaceId: quotes.workspaceId,
      inquiryId: quotes.inquiryId,
      quoteNumber: quotes.quoteNumber,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.publicToken, token),
        eq(quotes.status, "sent"),
        lt(quotes.validUntil, today),
      ),
    )
    .limit(1);

  if (!rows.length) {
    return 0;
  }

  return db.transaction((tx) => expireQuoteRows(tx, rows));
}

type CreateQuoteForWorkspaceInput = {
  workspaceId: string;
  actorUserId: string;
  currency: string;
  inquiryId?: string | null;
  quote: QuoteEditorInput;
};

export async function createQuoteForWorkspace({
  workspaceId,
  actorUserId,
  currency,
  inquiryId = null,
  quote,
}: CreateQuoteForWorkspaceInput) {
  const quoteId = createId("qt");
  const totals = calculateQuoteTotals(quote);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        if (inquiryId) {
          const [inquiry] = await tx
            .select({ id: inquiries.id })
            .from(inquiries)
            .where(and(eq(inquiries.id, inquiryId), eq(inquiries.workspaceId, workspaceId)))
            .limit(1);

          if (!inquiry) {
            return null;
          }
        }

        const [latestQuote] = await tx
          .select({
            quoteNumber: quotes.quoteNumber,
          })
          .from(quotes)
          .where(eq(quotes.workspaceId, workspaceId))
          .orderBy(desc(quotes.createdAt))
          .limit(1);
        const quoteNumber = getNextQuoteNumberFromCurrent(latestQuote?.quoteNumber);
        const now = new Date();

        await tx.insert(quotes).values({
          id: quoteId,
          workspaceId,
          inquiryId,
          status: "draft",
          quoteNumber,
          publicToken: createQuotePublicToken(),
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
            workspaceId,
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
          workspaceId,
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

type UpdateQuoteForWorkspaceInput = {
  workspaceId: string;
  quoteId: string;
  actorUserId: string;
  quote: QuoteEditorInput;
};

export async function updateQuoteForWorkspace({
  workspaceId,
  quoteId,
  actorUserId,
  quote,
}: UpdateQuoteForWorkspaceInput) {
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
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)))
      .limit(1);

    if (!existingQuote) {
      return null;
    }

    if (existingQuote.status !== "draft") {
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
      .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)));

    await tx
      .delete(quoteItems)
      .where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.workspaceId, workspaceId)));

    await tx.insert(quoteItems).values(
      totals.items.map((item) => ({
        id: item.id,
        workspaceId,
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
      workspaceId,
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

type ChangeQuoteStatusForWorkspaceInput = {
  workspaceId: string;
  quoteId: string;
  actorUserId: string;
  nextStatus: QuoteStatus;
};

export async function changeQuoteStatusForWorkspace({
  workspaceId,
  quoteId,
  actorUserId,
  nextStatus,
}: ChangeQuoteStatusForWorkspaceInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)))
      .limit(1);

    if (!existingQuote) {
      return null;
    }

    if (existingQuote.status === nextStatus) {
      return {
        changed: false,
        previousStatus: existingQuote.status,
        nextStatus,
        quoteNumber: existingQuote.quoteNumber,
        inquiryId: existingQuote.inquiryId,
      };
    }

    await tx
      .update(quotes)
      .set({
        status: nextStatus,
        sentAt:
          nextStatus === "draft"
            ? null
            : nextStatus === "sent"
              ? existingQuote.sentAt ?? now
              : existingQuote.sentAt,
        acceptedAt:
          nextStatus === "accepted"
            ? existingQuote.acceptedAt ?? now
            : null,
        publicViewedAt: nextStatus === "draft" ? null : undefined,
        customerRespondedAt:
          nextStatus === "draft" || nextStatus === "sent" ? null : undefined,
        customerResponseMessage:
          nextStatus === "draft" || nextStatus === "sent" ? null : undefined,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)));

    if (nextStatus === "sent") {
      await maybeMoveInquiryToQuoted(
        tx,
        workspaceId,
        existingQuote.inquiryId,
        now,
      );
    }

    if (nextStatus === "accepted") {
      await maybeMoveInquiryToWon(tx, workspaceId, existingQuote.inquiryId, now);
    }

    await insertQuoteActivity(tx, {
      workspaceId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.status_changed",
      summary: `Quote ${existingQuote.quoteNumber} moved from ${getQuoteStatusLabel(
        existingQuote.status,
      )} to ${getQuoteStatusLabel(nextStatus)}.`,
      metadata: {
        previousStatus: existingQuote.status,
        nextStatus,
        quoteNumber: existingQuote.quoteNumber,
      },
      now,
    });

    return {
      changed: true,
      previousStatus: existingQuote.status,
      nextStatus,
      quoteNumber: existingQuote.quoteNumber,
      inquiryId: existingQuote.inquiryId,
    };
  });
}

type MarkQuoteSentForWorkspaceInput = {
  workspaceId: string;
  quoteId: string;
  actorUserId: string;
};

export async function markQuoteSentForWorkspace({
  workspaceId,
  quoteId,
  actorUserId,
}: MarkQuoteSentForWorkspaceInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        publicToken: quotes.publicToken,
        status: quotes.status,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)))
      .limit(1);

    if (!existingQuote) {
      return null;
    }

    if (existingQuote.status !== "draft") {
      return {
        changed: false,
        status: existingQuote.status,
        quoteNumber: existingQuote.quoteNumber,
        inquiryId: existingQuote.inquiryId,
        publicToken: existingQuote.publicToken,
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
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)));

    await maybeMoveInquiryToQuoted(tx, workspaceId, existingQuote.inquiryId, now);

    await insertQuoteActivity(tx, {
      workspaceId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.sent",
      summary: `Quote ${existingQuote.quoteNumber} sent to the customer.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
      },
      now,
    });

    return {
      changed: true,
      status: "sent" as const,
      quoteNumber: existingQuote.quoteNumber,
      inquiryId: existingQuote.inquiryId,
      publicToken: existingQuote.publicToken,
    };
  });
}

export async function recordQuotePublicViewByToken(token: string) {
  const now = new Date();

  await db
    .update(quotes)
    .set({
      publicViewedAt: now,
    })
    .where(
      and(
        eq(quotes.publicToken, token),
        inArray(quotes.status, ["sent", "accepted", "rejected", "expired"]),
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
  await syncExpiredQuoteForPublicToken(token);

  const now = new Date();
  const nextStatus = response;

  return db.transaction(async (tx) => {
    const [existingQuote] = await tx
      .select({
        id: quotes.id,
        workspaceId: quotes.workspaceId,
        workspaceSlug: workspaces.slug,
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        sentAt: quotes.sentAt,
      })
      .from(quotes)
      .innerJoin(workspaces, eq(quotes.workspaceId, workspaces.id))
      .where(eq(quotes.publicToken, token))
      .limit(1);

    if (!existingQuote) {
      return null;
    }

    if (existingQuote.status !== "sent") {
      return {
        updated: false,
        workspaceId: existingQuote.workspaceId,
        inquiryId: existingQuote.inquiryId,
        quoteId: existingQuote.id,
        workspaceSlug: existingQuote.workspaceSlug,
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
        updatedAt: now,
      })
      .where(eq(quotes.id, existingQuote.id));

    if (nextStatus === "accepted") {
      await maybeMoveInquiryToWon(
        tx,
        existingQuote.workspaceId,
        existingQuote.inquiryId,
        now,
      );
    }

    await insertQuoteActivity(tx, {
      workspaceId: existingQuote.workspaceId,
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

    return {
      updated: true,
      workspaceId: existingQuote.workspaceId,
      inquiryId: existingQuote.inquiryId,
      quoteId: existingQuote.id,
      workspaceSlug: existingQuote.workspaceSlug,
      quoteNumber: existingQuote.quoteNumber,
      status: nextStatus,
    };
  });
}
