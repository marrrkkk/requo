import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { UIMessage } from "ai";

import { ChatPageView } from "@/features/ai/chat-ui/chat-page-view";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getAuthorizedAiConversation } from "@/features/ai/access";
import { getPaginatedAiMessagesForConversation } from "@/features/ai/conversations";
import { createNoIndexMetadata } from "@/lib/seo/site";

type ChatConversationPageProps = {
  params: Promise<{ businessSlug: string; id: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Chat",
  description: "AI assistant conversation.",
});

// Pull the most recent N messages so a refresh restores history.
// Older pages can be loaded lazily later if needed.
const INITIAL_MESSAGE_LIMIT = 50;

export default async function ChatConversationPage({
  params,
}: ChatConversationPageProps) {
  const { businessSlug, id: conversationId } = await params;
  const { user } = await getAppShellContext(businessSlug);

  const authorization = await getAuthorizedAiConversation({
    userId: user.id,
    conversationId,
  });

  if (!authorization) {
    notFound();
  }

  const page = await getPaginatedAiMessagesForConversation({
    conversationId,
    userId: user.id,
    limit: INITIAL_MESSAGE_LIMIT,
  });

  // Server returns messages in chronological order (oldest -> newest).
  // Include completed messages, failed assistant messages (error text), and
  // any trailing "generating" assistant message (interrupted stream).
  // Drop system rows.
  const initialMessages: UIMessage[] = page.messages
    .filter((m, idx, arr) => {
      if (m.role === "system") return false;
      if (m.role === "user") return true;
      if (m.status === "completed") return true;
      if (m.status === "failed" && m.content) return true;
      // Keep the trailing "generating" assistant row so the UI knows
      // a reply was in progress. Content may be empty if interrupted.
      if (m.status === "generating" && idx === arr.length - 1) return true;
      return false;
    })
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text", text: m.content || "" }],
    }));

  // Collect IDs of failed assistant messages so the client can render them
  // with error styling and a retry button.
  const failedMessageIds = new Set(
    page.messages
      .filter((m) => m.role === "assistant" && m.status === "failed" && m.content)
      .map((m) => m.id),
  );

  // Collect tool call names and structured outputs from message metadata.
  const toolCallsByMessageId: Record<string, string[]> = {};
  const structuredOutputsByMessageId: Record<string, unknown[]> = {};
  const actionProposalsByMessageId: Record<string, unknown[]> = {};
  for (const m of page.messages) {
    const meta = m.metadata as Record<string, unknown> | null;
    if (m.role === "assistant" && meta) {
      if (Array.isArray(meta.toolCalls) && meta.toolCalls.length > 0) {
        toolCallsByMessageId[m.id] = meta.toolCalls as string[];
      }
      if (Array.isArray(meta.structuredOutputs) && meta.structuredOutputs.length > 0) {
        structuredOutputsByMessageId[m.id] = meta.structuredOutputs;
      }
      if (Array.isArray(meta.actionProposals) && meta.actionProposals.length > 0) {
        actionProposalsByMessageId[m.id] = meta.actionProposals;
      }
    }
  }

  return (
    <div className="chat-page-container">
      <ChatPageView
        businessSlug={businessSlug}
        conversationId={conversationId}
        userName={user.name || "You"}
        initialMessages={initialMessages}
        failedMessageIds={[...failedMessageIds]}
        toolCallsByMessageId={toolCallsByMessageId}
        structuredOutputsByMessageId={structuredOutputsByMessageId}
        actionProposalsByMessageId={actionProposalsByMessageId}
      />
    </div>
  );
}
