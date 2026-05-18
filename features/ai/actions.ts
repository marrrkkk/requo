"use server";

import { aiGenerateQuoteDraftSchema } from "@/features/ai/schemas";
import { generateQuoteDraftForBusiness } from "@/features/ai/quote-generator";
import type { AiQuoteDraftActionState } from "@/features/ai/types";
import { getBusinessActionContext } from "@/lib/db/business-access";
import { hasFeatureAccess } from "@/lib/plans";
import { checkUsageLimit } from "@/lib/ai";
import { getEffectivePlan } from "@/lib/billing/subscription-service";
import type { AiTaskType } from "@/features/ai/task-registry";

// ---------------------------------------------------------------------------
// Server Actions
//
// NOTE: Pipeline utilities (executeAiPipeline, executeStreamingAiPipeline,
// hashPromptVersion) are imported directly from "@/features/ai/pipeline"
// by modules that need them. They cannot be re-exported from a "use server"
// file because Next.js only allows async function exports here.
// ---------------------------------------------------------------------------

/**
 * Generate an AI-drafted quote for the current business.
 *
 * Returns a structured draft the client can merge into the quote editor.
 * The action never mutates saved quotes; saving still happens through
 * `createQuoteAction` / `updateQuoteAction`.
 *
 * Pipeline: validate input → check usage limit → invoke quote generator
 * (which internally uses the AI pipeline for context building, model routing,
 * and response parsing).
 */
export async function generateQuoteDraftAction(
  businessSlug: string,
  prevState: AiQuoteDraftActionState,
  formData: FormData,
): Promise<AiQuoteDraftActionState> {
  void prevState;

  // 1. Validate input (Zod)
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

  // 2. Check business access
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

  // 3. Check plan feature access
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

  // 4. Check usage limit (replaces the old rate limiter for AI actions)
  const taskType: AiTaskType = "quote_draft";
  const businessId = actionContext.businessContext.business.id;
  const userId = actionContext.user.id;

  const plan = await getEffectivePlan(businessId);

  const usageCheck = await checkUsageLimit({
    userId,
    businessId,
    taskType,
    plan,
  });

  if (!usageCheck.allowed) {
    return {
      error: usageCheck.message,
    };
  }

  // 5. Invoke the quote generator (handles context building, AI call, response parsing)
  const result = await generateQuoteDraftForBusiness({
    businessId,
    userId,
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
