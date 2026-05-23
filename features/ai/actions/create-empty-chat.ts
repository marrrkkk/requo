"use server";

import { createDashboardConversation } from "@/features/ai/conversations";

type CreateEmptyChatInput = {
  userId: string;
  businessId: string;
};

type CreateEmptyChatResult = {
  conversationId: string | null;
  error?: string;
};

/**
 * Creates a new empty dashboard conversation (no initial message).
 */
export async function createEmptyChat(
  input: CreateEmptyChatInput,
): Promise<CreateEmptyChatResult> {
  try {
    const conversation = await createDashboardConversation({
      userId: input.userId,
      businessId: input.businessId,
      entityId: "global",
    });

    return { conversationId: conversation.id };
  } catch (error) {
    console.error(
      "[create-empty-chat] Failed:",
      error instanceof Error ? error.message : error,
    );
    return { conversationId: null, error: "Failed to create a new chat." };
  }
}
