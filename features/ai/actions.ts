"use server";

import type { AiAssistantActionState } from "@/features/ai/types";
import { getValidationActionState } from "@/lib/action-state";
import { getInquiryAssistantContextForWorkspace } from "@/features/ai/queries";
import { aiAssistantRequestSchema } from "@/features/ai/schemas";
import { generateInquiryAssistantResult } from "@/features/ai/service";
import { getOwnerWorkspaceActionContext } from "@/lib/db/workspace-access";

export async function generateInquiryAssistantAction(
  inquiryId: string,
  prevState: AiAssistantActionState,
  formData: FormData,
): Promise<AiAssistantActionState> {
  const ownerAccess = await getOwnerWorkspaceActionContext();

  if (!ownerAccess.ok) {
    return {
      ...prevState,
      error: ownerAccess.error,
    };
  }

  const { workspaceContext } = ownerAccess;

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

  const context = await getInquiryAssistantContextForWorkspace({
    workspaceId: workspaceContext.workspace.id,
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
