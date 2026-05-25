import type { ActionInput } from "./index";
import type { ActionResult } from "../types";
import { createJobFromQuoteForBusiness } from "@/features/jobs/mutations";
import { db } from "@/lib/db/client";
import { businesses, quotes } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Creates a job linked to an accepted quote using existing job creation logic.
 * (Requirement 4.7)
 */
export async function executeCreateJobFromQuote(
  input: ActionInput,
): Promise<ActionResult> {
  const payload = input.triggerPayload as Record<string, unknown>;

  const quoteId = (payload.quoteId as string) ?? null;

  if (!quoteId) {
    return {
      success: false,
      error:
        "Cannot create job: trigger payload must include quoteId.",
    };
  }

  // Security: validate that the quote belongs to this business (Requirement 10.4)
  const [quote] = await db
    .select({ id: quotes.id, businessId: quotes.businessId })
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
      error:
        "Quote not found or does not belong to this business.",
    };
  }

  // Get the business owner to use as the actor
  const [business] = await db
    .select({ ownerUserId: businesses.ownerUserId })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  if (!business) {
    return { success: false, error: "Business not found." };
  }

  const result = await createJobFromQuoteForBusiness({
    businessId: input.businessId,
    quoteId,
    userId: business.ownerUserId,
  });

  if ("error" in result && result.error) {
    // If a job already exists, treat it as a soft success (idempotent)
    if ("jobId" in result && result.jobId) {
      return {
        success: true,
        result: { jobId: result.jobId, alreadyExisted: true },
      };
    }
    return { success: false, error: result.error };
  }

  return {
    success: true,
    result: { jobId: result.jobId },
  };
}
