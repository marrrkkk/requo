"use server";

import { aiGenerateQuoteDraftSchema } from "@/features/ai/schemas";
import { generateQuoteDraftForBusiness } from "@/features/ai/quote-generator";
import type { AiQuoteDraftActionState } from "@/features/ai/types";
import { getBusinessActionContext } from "@/lib/db/business-access";
import { hasFeatureAccess } from "@/lib/plans";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";

/**
 * Generate an AI-drafted quote for the current business.
 *
 * Returns a structured draft the client can merge into the quote editor.
 * The action never mutates saved quotes; saving still happens through
 * `createQuoteAction` / `updateQuoteAction`.
 */
export async function generateQuoteDraftAction(
  businessSlug: string,
  prevState: AiQuoteDraftActionState,
  formData: FormData,
): Promise<AiQuoteDraftActionState> {
  void prevState;

  const parsed = aiGenerateQuoteDraftSchema.safeParse({
    businessSlug,
    inquiryId: formData.get("inquiryId"),
    brief: formData.get("brief"),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];

    return {
      error: firstIssue?.message ?? "Check the request and try again.",
    };
  }

  const actionContext = await getBusinessActionContext({
    businessSlug: parsed.data.businessSlug,
    minimumRole: "staff",
    requireActiveBusiness: true,
    unauthorizedMessage: "You do not have access to that business action.",
  });

  if (!actionContext.ok) {
    return {
      error: actionContext.error,
    };
  }

  if (
    !hasFeatureAccess(
      actionContext.businessContext.business.plan,
      "aiAssistant",
    )
  ) {
    return {
      error: "Upgrade to Pro to use the AI quote generator.",
    };
  }

  const allowed = await assertPublicActionRateLimit({
    action: "ai-quote-draft",
    limit: 10,
    scope: `${actionContext.businessContext.business.id}:${actionContext.user.id}`,
    windowMs: 60_000,
  });

  if (!allowed) {
    return {
      error: "Too many AI generations. Wait a minute and try again.",
    };
  }

  const result = await generateQuoteDraftForBusiness({
    businessId: actionContext.businessContext.business.id,
    inquiryId: parsed.data.inquiryId ?? null,
    brief: parsed.data.brief ?? null,
  });

  if (!result.ok) {
    return {
      error: result.error,
    };
  }

  return {
    draft: result.draft,
  };
}
