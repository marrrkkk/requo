"use server";

import {
  createAiUserMessage,
  createDashboardConversation,
} from "@/features/ai/conversations";

type StartNewChatInput = {
  userId: string;
  businessId: string;
  businessSlug: string;
  message: string;
};

type StartNewChatResult = {
  conversationId: string | null;
  message?: string;
  error?: string;
};

/**
 * Server action that creates a new dashboard conversation and persists the
 * first user message. Returns the conversationId so the client can navigate
 * directly to the chat page.
 */
export async function startNewChat(
  input: StartNewChatInput,
): Promise<StartNewChatResult> {
  try {
    const conversation = await createDashboardConversation({
      userId: input.userId,
      businessId: input.businessId,
      entityId: "global",
      title: input.message.slice(0, 80),
    });

    await createAiUserMessage({
      conversationId: conversation.id,
      content: input.message,
    });

    return { conversationId: conversation.id, message: input.message };
  } catch (error) {
    console.error(
      "[start-new-chat] Failed:",
      error instanceof Error ? error.message : error,
    );
    return { conversationId: null, error: "Failed to start a new chat. Please try again." };
  }
}
