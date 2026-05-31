import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { activityLogs, inquiries, quotes } from "@/lib/db/schema";

import type { ActionResult } from "../types";
import type { ActionInput } from "./index";

/**
 * Records an internal note as an activity log entry on the inquiry or quote
 * that the trigger payload references. Only the business owner sees it.
 *
 * Resolution order:
 *   1. quoteId from payload (preferred — most specific)
 *   2. inquiryId from payload
 *
 * If neither is present, the action fails with a clear error.
 */
export async function executeAddInternalNote(
  input: ActionInput,
): Promise<ActionResult> {
  const config = input.actionConfig as Extract<
    typeof input.actionConfig,
    { type: "add_internal_note" }
  >;
  const payload = input.triggerPayload as Record<string, unknown>;

  const quoteId = (payload.quoteId as string | undefined) ?? null;
  const inquiryId = (payload.inquiryId as string | undefined) ?? null;

  if (!quoteId && !inquiryId) {
    return {
      success: false,
      error:
        "Cannot add internal note: trigger payload must include quoteId or inquiryId.",
    };
  }

  // Validate ownership of the referenced row before writing.
  let resolvedInquiryId: string | null = inquiryId;
  let resolvedQuoteId: string | null = null;

  if (quoteId) {
    const [quote] = await db
      .select({ id: quotes.id, inquiryId: quotes.inquiryId })
      .from(quotes)
      .where(
        and(
          eq(quotes.id, quoteId),
          eq(quotes.businessId, input.businessId),
          isNull(quotes.deletedAt),
        ),
      )
      .limit(1);

    if (!quote) {
      return {
        success: false,
        error: "Quote not found or does not belong to this business.",
      };
    }

    resolvedQuoteId = quote.id;
    if (!resolvedInquiryId) {
      resolvedInquiryId = quote.inquiryId ?? null;
    }
  } else if (resolvedInquiryId) {
    const [inquiry] = await db
      .select({ id: inquiries.id })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.id, resolvedInquiryId),
          eq(inquiries.businessId, input.businessId),
          isNull(inquiries.deletedAt),
        ),
      )
      .limit(1);

    if (!inquiry) {
      return {
        success: false,
        error: "Inquiry not found or does not belong to this business.",
      };
    }
  }

  const now = new Date();
  const id = `act_${crypto.randomUUID().replace(/-/g, "")}`;

  await db.insert(activityLogs).values({
    id,
    businessId: input.businessId,
    inquiryId: resolvedInquiryId,
    quoteId: resolvedQuoteId,
    actorUserId: null,
    type: "note.internal",
    summary: config.note,
    metadata: {
      source: "automation",
    },
    createdAt: now,
    updatedAt: now,
  });

  return {
    success: true,
    result: { activityId: id, quoteId: resolvedQuoteId, inquiryId: resolvedInquiryId },
  };
}
