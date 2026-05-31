import type { ActionInput } from "./index";
import type { ActionResult } from "../types";
import { db } from "@/lib/db/client";
import { activityLogs, quotes } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { quoteStatuses } from "@/features/quotes/types";

/**
 * Updates the quote status to the configured target status (e.g., for expiration).
 * Only allows safe automated transitions: draft, expired, voided.
 * (Requirement 4.6)
 */
export async function executeUpdateQuoteStatus(
  input: ActionInput,
): Promise<ActionResult> {
  const config = input.actionConfig as Extract<
    typeof input.actionConfig,
    { type: "update_quote_status" }
  >;
  const payload = input.triggerPayload as Record<string, unknown>;

  const quoteId = payload.quoteId as string | undefined;

  if (!quoteId) {
    return {
      success: false,
      error:
        "Cannot update quote status: trigger payload does not include quoteId.",
    };
  }

  // Validate the target status
  const validStatuses: readonly string[] = quoteStatuses;
  if (!validStatuses.includes(config.status)) {
    return {
      success: false,
      error: `Invalid target quote status: "${config.status}". Valid statuses: ${quoteStatuses.join(", ")}.`,
    };
  }

  // Only allow safe automated transitions
  const automatedStatuses = ["expired", "voided"] as const;
  if (
    !(automatedStatuses as readonly string[]).includes(config.status)
  ) {
    return {
      success: false,
      error: `Automated quote status change to "${config.status}" is not permitted. Only "expired" and "voided" are allowed for automations.`,
    };
  }

  const now = new Date();

  const [quote] = await db
    .select({
      id: quotes.id,
      status: quotes.status,
      businessId: quotes.businessId,
      quoteNumber: quotes.quoteNumber,
      inquiryId: quotes.inquiryId,
    })
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

  if (quote.status === config.status) {
    return {
      success: true,
      result: { quoteId, status: config.status, alreadyAtTarget: true },
    };
  }

  // Only expire quotes that are in "sent" status
  if (config.status === "expired" && quote.status !== "sent") {
    return {
      success: false,
      error: `Cannot expire quote: current status is "${quote.status}", only "sent" quotes can be expired.`,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(quotes)
      .set({
        status: config.status as (typeof quoteStatuses)[number],
        updatedAt: now,
      })
      .where(
        and(eq(quotes.id, quoteId), eq(quotes.businessId, input.businessId)),
      );

    await tx.insert(activityLogs).values({
      id: `act_${crypto.randomUUID().replace(/-/g, "")}`,
      businessId: input.businessId,
      inquiryId: quote.inquiryId,
      quoteId,
      actorUserId: null,
      type: `quote.${config.status}`,
      summary: `Quote ${quote.quoteNumber} ${config.status} by automation.`,
      metadata: {
        previousStatus: quote.status,
        quoteNumber: quote.quoteNumber,
        source: "automation",
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    success: true,
    result: {
      quoteId,
      previousStatus: quote.status,
      newStatus: config.status,
    },
  };
}
