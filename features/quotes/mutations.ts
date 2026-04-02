import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
  quoteItems,
  quotes,
} from "@/lib/db/schema";
import type { QuoteEditorInput } from "@/features/quotes/schemas";
import type { QuoteStatus } from "@/features/quotes/types";
import { getQuoteStatusLabel } from "@/features/quotes/utils";

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

function isQuoteNumberConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505" &&
    (("constraint_name" in error &&
      error.constraint_name === "quotes_workspace_quote_number_unique") ||
      ("constraint" in error &&
        error.constraint === "quotes_workspace_quote_number_unique"))
  );
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

  for (let attempt = 0; attempt < 3; attempt += 1) {
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

        await tx.insert(activityLogs).values({
          id: createId("act"),
          workspaceId,
          inquiryId,
          quoteId,
          actorUserId,
          type: "quote.created",
          summary: `Draft quote ${quoteNumber} created.`,
          metadata: {
            quoteNumber,
          },
          createdAt: now,
          updatedAt: now,
        });

        return {
          id: quoteId,
          quoteNumber,
        };
      });
    } catch (error) {
      if (attempt < 2 && isQuoteNumberConflict(error)) {
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

    await tx.insert(activityLogs).values({
      id: createId("act"),
      workspaceId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.updated",
      summary: `Draft quote ${existingQuote.quoteNumber} updated.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
      },
      createdAt: now,
      updatedAt: now,
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
          nextStatus === "sent" ? existingQuote.sentAt ?? now : existingQuote.sentAt,
        acceptedAt: nextStatus === "accepted" ? now : null,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)));

    if (existingQuote.inquiryId && nextStatus === "sent") {
      await tx
        .update(inquiries)
        .set({
          status: "quoted",
          updatedAt: now,
        })
        .where(
          and(
            eq(inquiries.id, existingQuote.inquiryId),
            eq(inquiries.workspaceId, workspaceId),
            eq(inquiries.status, "new"),
          ),
        );

      await tx
        .update(inquiries)
        .set({
          status: "quoted",
          updatedAt: now,
        })
        .where(
          and(
            eq(inquiries.id, existingQuote.inquiryId),
            eq(inquiries.workspaceId, workspaceId),
            eq(inquiries.status, "waiting"),
          ),
        );
    }

    await tx.insert(activityLogs).values({
      id: createId("act"),
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
      createdAt: now,
      updatedAt: now,
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
      };
    }

    await tx
      .update(quotes)
      .set({
        status: "sent",
        sentAt: now,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)));

    if (existingQuote.inquiryId) {
      await tx
        .update(inquiries)
        .set({
          status: "quoted",
          updatedAt: now,
        })
        .where(
          and(
            eq(inquiries.id, existingQuote.inquiryId),
            eq(inquiries.workspaceId, workspaceId),
            eq(inquiries.status, "new"),
          ),
        );

      await tx
        .update(inquiries)
        .set({
          status: "quoted",
          updatedAt: now,
        })
        .where(
          and(
            eq(inquiries.id, existingQuote.inquiryId),
            eq(inquiries.workspaceId, workspaceId),
            eq(inquiries.status, "waiting"),
          ),
        );
    }

    await tx.insert(activityLogs).values({
      id: createId("act"),
      workspaceId,
      inquiryId: existingQuote.inquiryId,
      quoteId,
      actorUserId,
      type: "quote.sent",
      summary: `Quote ${existingQuote.quoteNumber} sent to the customer.`,
      metadata: {
        quoteNumber: existingQuote.quoteNumber,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      changed: true,
      status: "sent" as const,
      quoteNumber: existingQuote.quoteNumber,
      inquiryId: existingQuote.inquiryId,
    };
  });
}
