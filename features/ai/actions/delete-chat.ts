"use server";

import { deleteDashboardConversation } from "@/features/ai/conversations";

type DeleteChatInput = {
  conversationId: string;
  userId: string;
};

type DeleteChatResult = {
  deleted: boolean;
  error?: string;
};

/**
 * Deletes a dashboard conversation.
 */
export async function deleteChat(
  input: DeleteChatInput,
): Promise<DeleteChatResult> {
  try {
    const result = await deleteDashboardConversation({
      conversationId: input.conversationId,
      userId: input.userId,
    });

    if (!result) {
      return { deleted: false, error: "Conversation not found." };
    }

    return { deleted: true };
  } catch (error) {
    console.error(
      "[delete-chat] Failed:",
      error instanceof Error ? error.message : error,
    );
    return { deleted: false, error: "Failed to delete conversation." };
  }
}
