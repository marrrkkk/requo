"use server";

import { executeAiPipeline } from "@/features/ai/pipeline";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";

export type GenerateFollowUpMessageActionState = {
  error?: string;
  message?: string;
};

/**
 * Generates an AI-crafted follow-up message based on inquiry/quote context.
 */
export async function generateFollowUpMessageAction(
  _prevState: GenerateFollowUpMessageActionState,
  formData: FormData,
): Promise<GenerateFollowUpMessageActionState> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;
  const customerName = formData.get("customerName") as string || "the customer";
  const followUpReason = formData.get("followUpReason") as string || "";
  const channel = formData.get("channel") as string || "email";
  const recordContext = formData.get("recordContext") as string || "";
  const quoteViewed = formData.get("quoteViewed") === "true";

  const userMessage = [
    `Write a short, warm, professional follow-up message for ${channel} to ${customerName}.`,
    followUpReason ? `Reason for follow-up: ${followUpReason}` : "",
    recordContext ? `Context: ${recordContext}` : "",
    quoteViewed ? "Note: The customer already viewed the quote." : "",
    `Keep it under 3 sentences. Be concise and helpful. Don't use placeholder brackets.`,
    `Business name: ${businessContext.business.name}.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await executeAiPipeline({
      userId: user.id,
      businessId: businessContext.business.id,
      taskType: "followup_message",
      availableData: {
        inquiryText: recordContext || "follow-up needed",
        customerName,
        tonePreference: "balanced",
        followUpReason: followUpReason || "general follow-up",
      },
      sourceDataVersions: {},
      promptVersion: "v1",
      systemPrompt: "You are a helpful assistant that writes brief, professional follow-up messages for service businesses. Write natural, conversational messages. Do not use placeholder brackets like [Name].",
      userMessage,
    });

    if (!result.ok) {
      return { error: result.error ?? "Couldn't generate a message right now." };
    }

    return { message: result.text.trim() };
  } catch (error) {
    console.error("Failed to generate follow-up message", error);
    return { error: "Couldn't generate a message right now. Try again later." };
  }
}
