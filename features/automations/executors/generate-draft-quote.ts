import type { ActionInput } from "./index";
import type { ActionResult } from "../types";
import { generateQuoteDraftForBusiness } from "@/features/ai/quote-generator";
import { db } from "@/lib/db/client";
import { businesses, inquiries } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Invokes the existing AI quote generator to create a draft quote from inquiry data.
 * The quote is left in draft status for owner review.
 * (Requirement 4.6)
 */
export async function executeGenerateDraftQuote(
  input: ActionInput,
): Promise<ActionResult> {
  const config = input.actionConfig as Extract<
    typeof input.actionConfig,
    { type: "generate_draft_quote" }
  >;
  const payload = input.triggerPayload as Record<string, unknown>;

  const inquiryId = (payload.inquiryId as string) ?? null;

  if (!inquiryId) {
    return {
      success: false,
      error:
        "Cannot generate draft quote: trigger payload must include inquiryId.",
    };
  }

  // Security: validate that the inquiry belongs to this business (Requirement 10.4)
  const [inquiry] = await db
    .select({ id: inquiries.id, businessId: inquiries.businessId })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.id, inquiryId),
        eq(inquiries.businessId, input.businessId),
        isNull(inquiries.deletedAt),
      ),
    )
    .limit(1);

  if (!inquiry) {
    return {
      success: false,
      error:
        "Inquiry not found or does not belong to this business.",
    };
  }

  // Get the business owner to use as the actor for AI generation
  const [business] = await db
    .select({ ownerUserId: businesses.ownerUserId })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  if (!business) {
    return { success: false, error: "Business not found." };
  }

  // Only invoke AI if configured to do so (useAi defaults to true)
  if (!config.useAi) {
    return {
      success: false,
      error: "AI generation is disabled for this action configuration.",
    };
  }

  const result = await generateQuoteDraftForBusiness({
    businessId: input.businessId,
    userId: business.ownerUserId,
    inquiryId,
  });

  if (!result.ok) {
    return {
      success: false,
      error: `AI draft quote generation failed: ${result.error}`,
    };
  }

  return {
    success: true,
    result: {
      draftTitle: result.draft.title,
      itemCount: result.draft.items.length,
      status: "draft",
    },
  };
}
