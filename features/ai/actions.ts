"use server";

import type { AiAssistantActionState } from "@/features/ai/types";
import { getValidationActionState } from "@/lib/action-state";
import { getInquiryAssistantContextForBusiness } from "@/features/ai/queries";
import { aiAssistantRequestSchema } from "@/features/ai/schemas";
import { generateInquiryAssistantResult } from "@/features/ai/service";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import { hasFeatureAccess } from "@/lib/plans";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";

export async function generateInquiryAssistantAction(
  inquiryId: string,
  prevState: AiAssistantActionState,
  formData: FormData,
): Promise<AiAssistantActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return {
      ...prevState,
      error: ownerAccess.error,
    };
  }

  const { businessContext } = ownerAccess;

  if (!hasFeatureAccess(businessContext.business.plan, "aiAssistant")) {
    return {
      ...prevState,
      error: "Upgrade to Pro to use the AI assistant.",
    };
  }

  const isAllowed = await assertPublicActionRateLimit({
    action: "business-inquiry-ai",
    limit: 10,
    scope: `${businessContext.business.id}:${ownerAccess.user.id}:${inquiryId}`,
    windowMs: 60_000,
  });

  if (!isAllowed) {
    return {
      ...prevState,
      error: "Too many AI requests. Wait a minute and try again.",
    };
  }

  const validationResult = aiAssistantRequestSchema.safeParse({
    intent: formData.get("intent"),
    customPrompt: formData.get("customPrompt"),
    sourceDraft: formData.get("sourceDraft"),
  });

  if (!validationResult.success) {
    return {
      ...prevState,
      ...getValidationActionState(validationResult.error, "Check the AI request and try again."),
    };
  }

  const context = await getInquiryAssistantContextForBusiness({
    businessId: businessContext.business.id,
    inquiryId,
  });

  if (!context) {
    return {
      ...prevState,
      error: "That inquiry could not be found.",
    };
  }

  try {
    const result = await generateInquiryAssistantResult({
      context,
      request: validationResult.data,
    });

    return {
      result,
    };
  } catch (error) {
    console.error("Failed to generate inquiry AI output.", error);

    return {
      ...prevState,
      error: "The assistant could not generate an answer right now. Try again in a moment.",
    };
  }
}
