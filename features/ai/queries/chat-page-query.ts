import "server-only";

import { desc, eq } from "drizzle-orm";

import { getConversationByIdForUser } from "@/features/ai/conversations";
import type { AiConversation } from "@/features/ai/types";
import { db } from "@/lib/db/client";
import { aiMessages } from "@/lib/db/schema";

/**
 * Fetches a conversation for the /chat/[id] page.
 * Returns null if the conversation doesn't exist or doesn't belong to the user/business.
 */
export async function getConversationForChatPage({
  conversationId,
  userId,
  businessId,
}: {
  conversationId: string;
  userId: string;
  businessId: string;
}): Promise<(AiConversation & { lastUserMessageContent?: string }) | null> {
  const conversation = await getConversationByIdForUser({
    conversationId,
    userId,
  });

  if (!conversation) return null;

  // Verify the conversation belongs to this business
  if (conversation.businessId !== businessId) return null;

  // If the conversation was just created, fetch the last user message content
  // so the route page can pass it as pendingMessage for immediate AI response.
  const age = Date.now() - new Date(conversation.createdAt).getTime();
  if (age < 10_000) {
    const [lastMsg] = await db
      .select({ content: aiMessages.content })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(desc(aiMessages.createdAt))
      .limit(1);

    return { ...conversation, lastUserMessageContent: lastMsg?.content ?? undefined };
  }

  return conversation;
}
