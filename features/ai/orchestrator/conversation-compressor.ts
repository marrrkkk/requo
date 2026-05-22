import "server-only";

import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  generateWithFallback,
  summarizeDroppedMessages,
} from "@/lib/ai";
import type { AiChatMessage } from "@/lib/ai";
import { db } from "@/lib/db/client";
import { conversationSummaries } from "@/lib/db/schema";

import type { CompressionConfig } from "./types";

// ---------------------------------------------------------------------------
// Conversation Compressor
//
// Maintains rolling summaries for long conversations. Triggers when message
// count exceeds a configurable threshold, summarizes older messages using a
// cheap-tier model, and stores the summary in the `conversation_summaries`
// table. Falls back to heuristic summarization on failure.
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: CompressionConfig = {
  messageThreshold: 10,
  recentWindowSize: 6,
};

function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

function resolveConfig(config?: Partial<CompressionConfig>): CompressionConfig {
  const threshold = Math.max(6, Math.min(50, config?.messageThreshold ?? DEFAULT_CONFIG.messageThreshold));
  const maxWindow = threshold - 1;
  const recentWindowSize = Math.max(2, Math.min(maxWindow, config?.recentWindowSize ?? DEFAULT_CONFIG.recentWindowSize));
  return { messageThreshold: threshold, recentWindowSize };
}

/**
 * Compresses a conversation by summarizing older messages and storing the
 * summary in the database. Only triggers when message count exceeds the
 * configured threshold.
 *
 * Designed to be called asynchronously after stream completion (fire-and-forget
 * with error logging).
 */
export async function compressConversation(
  conversationId: string,
  messages: AiChatMessage[],
  config?: Partial<CompressionConfig>,
): Promise<void> {
  const resolved = resolveConfig(config);

  // Only trigger if message count exceeds threshold
  if (messages.length <= resolved.messageThreshold) {
    return;
  }

  const olderMessages = messages.slice(0, -resolved.recentWindowSize);
  if (olderMessages.length === 0) {
    return;
  }

  let summary: string;

  try {
    summary = await generateSummary(olderMessages);
  } catch (error) {
    console.warn(
      `[conversation-compressor] AI summary failed for conversation="${conversationId}", falling back to heuristic`,
      error instanceof Error ? error.message : error,
    );
    summary = summarizeDroppedMessages(olderMessages);
  }

  if (!summary || summary.trim().length === 0) {
    return;
  }

  // Upsert the summary into the database
  await db
    .insert(conversationSummaries)
    .values({
      id: createId("cs"),
      conversationId,
      summary: summary.trim(),
      messageCount: olderMessages.length,
    })
    .onConflictDoUpdate({
      target: conversationSummaries.conversationId,
      set: {
        summary: summary.trim(),
        messageCount: olderMessages.length,
        updatedAt: new Date(),
      },
    });
}

/**
 * Retrieves conversation context: any existing summary plus recent messages.
 * Returns null summary gracefully if the table doesn't exist yet (pre-migration).
 */
export async function getConversationContext(
  conversationId: string,
  recentMessages: AiChatMessage[],
): Promise<{ summary: string | null; messages: AiChatMessage[] }> {
  try {
    const result = await db
      .select({ summary: conversationSummaries.summary })
      .from(conversationSummaries)
      .where(eq(conversationSummaries.conversationId, conversationId))
      .limit(1);

    const summary = result[0]?.summary ?? null;

    return { summary, messages: recentMessages };
  } catch (error) {
    // Table may not exist yet if migration hasn't been applied
    console.warn(
      "[conversation-compressor] Failed to query conversation summaries, returning no summary:",
      error instanceof Error ? error.message : error,
    );
    return { summary: null, messages: recentMessages };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function generateSummary(messages: AiChatMessage[]): Promise<string> {
  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 3000); // Keep input reasonable

  const response = await generateWithFallback({
    model: "",
    qualityTier: "cheap",
    maxOutputTokens: 256,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are a conversation summarizer. Summarize the following conversation into a concise summary of no more than 200 words. Focus on key topics discussed, decisions made, and important context. Output only the summary text, nothing else.",
      },
      {
        role: "user",
        content: conversationText,
      },
    ],
  });

  return response.text;
}
