/**
 * AI Agent Message Service
 *
 * Operations for persisting and retrieving agent messages.
 */

import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiAgentMessages } from "@/lib/db/schema";
import type { AgentMessage, MessageRole, MessageMetadata } from "@/features/ai-agent/types";

/**
 * Generate a prefixed ID.
 */
function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Add a message to a session.
 */
export async function addAgentMessage({
  sessionId,
  role,
  content,
  toolName,
  toolCallId,
  provider,
  model,
  metadata = {},
}: {
  sessionId: string;
  role: MessageRole;
  content: string;
  toolName?: string;
  toolCallId?: string;
  provider?: string;
  model?: string;
  metadata?: MessageMetadata;
}): Promise<AgentMessage> {
  const messageId = createId("agm");
  const now = new Date();

  const [message] = await db
    .insert(aiAgentMessages)
    .values({
      id: messageId,
      sessionId,
      role,
      content,
      toolName: toolName ?? null,
      toolCallId: toolCallId ?? null,
      provider: provider ?? null,
      model: model ?? null,
      metadata,
      createdAt: now,
    })
    .returning();

  return message;
}

/**
 * Load conversation history for a session.
 * Returns messages in chronological order (oldest first).
 */
export async function loadConversationHistory(
  sessionId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
): Promise<AgentMessage[]> {
  const query = db
    .select()
    .from(aiAgentMessages)
    .where(eq(aiAgentMessages.sessionId, sessionId))
    .orderBy(asc(aiAgentMessages.createdAt));

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.offset) {
    query.offset(options.offset);
  }

  return await query;
}

/**
 * Load most recent messages for a session.
 * Returns messages in reverse chronological order (newest first).
 */
export async function loadRecentMessages(
  sessionId: string,
  limit: number = 10,
): Promise<AgentMessage[]> {
  const messages = await db
    .select()
    .from(aiAgentMessages)
    .where(eq(aiAgentMessages.sessionId, sessionId))
    .orderBy(desc(aiAgentMessages.createdAt))
    .limit(limit);

  // Reverse to get chronological order
  return messages.reverse();
}

/**
 * Count messages in a session.
 */
export async function countSessionMessages(sessionId: string): Promise<number> {
  const result = await db
    .select({ count: aiAgentMessages.id })
    .from(aiAgentMessages)
    .where(eq(aiAgentMessages.sessionId, sessionId));

  return result.length;
}

/**
 * Count messages by role in a session.
 */
export async function countSessionMessagesByRole(
  sessionId: string,
  role: MessageRole,
): Promise<number> {
  const result = await db
    .select({ count: aiAgentMessages.id })
    .from(aiAgentMessages)
    .where(and(eq(aiAgentMessages.sessionId, sessionId), eq(aiAgentMessages.role, role)));

  return result.length;
}

/**
 * Build conversation history for the AI SDK.
 * Filters to user and assistant messages only, formats for the SDK.
 * Windowed to the most recent `limit` messages so a long session cannot grow
 * the prompt without bound.
 */
export async function buildAiSdkMessages(
  sessionId: string,
  limit = 30,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await loadRecentMessages(sessionId, limit);

  // Filter to user and assistant messages only
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}
