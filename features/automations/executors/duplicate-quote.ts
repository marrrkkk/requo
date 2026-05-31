import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { activityLogs, quoteItems, quotes } from "@/lib/db/schema";
import { createStoredQuotePublicToken } from "@/features/quotes/token-storage";

import type { ActionResult } from "../types";
import type { ActionInput } from "./index";

/**
 * Duplicates an existing quote into a new draft owned by the same business.
 * Items, totals, customer info, terms, and notes are copied. Status is reset
 * to "draft", a fresh quote number and public token are generated, and any
 * lifecycle timestamps (sent, accepted, viewed, etc.) are dropped.
 *
 * Useful for "expired -> create new draft" or "rejected -> resend with edits"
 * automation patterns. The trigger payload must include `quoteId`.
 */
export async function executeDuplicateQuote(
  input: ActionInput,
): Promise<ActionResult> {
  const config = input.actionConfig as Extract<
    typeof input.actionConfig,
    { type: "duplicate_quote" }
  >;
  const payload = input.triggerPayload as Record<string, unknown>;

  const sourceQuoteId = payload.quoteId as string | undefined;

  if (!sourceQuoteId) {
    return {
      success: false,
      error: "Cannot duplicate quote: trigger payload must include quoteId.",
    };
  }

  // Load the source quote scoped to this business so we don't leak across tenants.
  const [source] = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.id, sourceQuoteId),
        eq(quotes.businessId, input.businessId),
        isNull(quotes.deletedAt),
      ),
    )
    .limit(1);

  if (!source) {
    return {
      success: false,
      error: "Source quote not found or does not belong to this business.",
    };
  }

  const sourceItems = await db
    .select()
    .from(quoteItems)
    .where(
      and(
        eq(quoteItems.quoteId, source.id),
        eq(quoteItems.businessId, input.businessId),
      ),
    )
    .orderBy(asc(quoteItems.position));

  const newQuoteId = `qt_${crypto.randomUUID().replace(/-/g, "")}`;
  const storedPublicToken = createStoredQuotePublicToken();
  const now = new Date();

  // Allocate a new quote number (sequence-based, retry on conflict).
  let attempt = 0;
  let createdQuoteNumber: string | null = null;

  while (attempt < 5 && !createdQuoteNumber) {
    attempt++;

    const [latest] = await db
      .select({
        latestSequence: sql<number>`coalesce(max((nullif(substring(${quotes.quoteNumber} from '[0-9]+$'), ''))::integer), 0)`,
      })
      .from(quotes)
      .where(eq(quotes.businessId, input.businessId))
      .limit(1);

    const nextSequence = (Number(latest?.latestSequence ?? 0) || 0) + 1;
    const candidate = `Q-${String(nextSequence).padStart(4, "0")}`;

    try {
      await db.transaction(async (tx) => {
        const suffix = (config.titleSuffix ?? "(copy)").trim();
        const newTitle = suffix.length > 0 ? `${source.title} ${suffix}` : source.title;

        await tx.insert(quotes).values({
          id: newQuoteId,
          businessId: source.businessId,
          inquiryId: source.inquiryId,
          status: "draft",
          quoteNumber: candidate,
          publicToken: storedPublicToken.publicToken,
          publicTokenHash: storedPublicToken.publicTokenHash,
          title: newTitle,
          customerName: source.customerName,
          customerEmail: source.customerEmail,
          customerContactMethod: source.customerContactMethod,
          customerContactHandle: source.customerContactHandle,
          currency: source.currency,
          notes: source.notes,
          terms: source.terms,
          subtotalInCents: source.subtotalInCents,
          discountInCents: source.discountInCents,
          taxInCents: source.taxInCents,
          taxLabel: source.taxLabel,
          totalInCents: source.totalInCents,
          validUntil: source.validUntil,
          createdAt: now,
          updatedAt: now,
        });

        if (sourceItems.length > 0) {
          await tx.insert(quoteItems).values(
            sourceItems.map((item) => ({
              id: `qit_${crypto.randomUUID().replace(/-/g, "")}`,
              businessId: item.businessId,
              quoteId: newQuoteId,
              description: item.description,
              quantity: item.quantity,
              unitPriceInCents: item.unitPriceInCents,
              lineTotalInCents: item.lineTotalInCents,
              position: item.position,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }

        await tx.insert(activityLogs).values({
          id: `act_${crypto.randomUUID().replace(/-/g, "")}`,
          businessId: source.businessId,
          inquiryId: source.inquiryId,
          quoteId: newQuoteId,
          actorUserId: null,
          type: "quote.duplicated",
          summary: `Quote ${candidate} duplicated from ${source.quoteNumber} by automation.`,
          metadata: {
            sourceQuoteId: source.id,
            sourceQuoteNumber: source.quoteNumber,
            source: "automation",
          },
          createdAt: now,
          updatedAt: now,
        });
      });

      createdQuoteNumber = candidate;
    } catch (error) {
      // Retry on unique-constraint conflicts on quote number; otherwise propagate.
      const message = error instanceof Error ? error.message : String(error);
      if (
        attempt < 5 &&
        (message.includes("unique") || message.includes("duplicate key"))
      ) {
        continue;
      }
      throw error;
    }
  }

  if (!createdQuoteNumber) {
    return {
      success: false,
      error: "Failed to allocate a unique quote number for the duplicate.",
    };
  }

  return {
    success: true,
    result: {
      sourceQuoteId: source.id,
      duplicatedQuoteId: newQuoteId,
      duplicatedQuoteNumber: createdQuoteNumber,
    },
  };
}
