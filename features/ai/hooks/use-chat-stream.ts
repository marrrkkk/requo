"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AiChatStreamEvent, AiSurface } from "@/features/ai/types";
import type { ChatMessage } from "@/features/ai/chat-ui/chat-message-list";
import {
  consumeStream,
  createMessageId,
  fetchMessagePage,
  mapAiMessageToChatMessage,
  type ChatMessage as HelperChatMessage,
} from "@/features/ai/components/ai-chat-helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a HelperChatMessage (may have "system" role) to the UI ChatMessage type. */
function toChatMessage(msg: HelperChatMessage): ChatMessage | null {
  if (msg.role === "system") return null;
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    isError: msg.isError,
    pending: msg.pending,
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UseChatStreamParams = {
  conversationId: string;
  businessSlug: string;
  surface: AiSurface;
  entityId: string;
  /** Display name for the current user (used in message labels). */
  userName?: string;
};

export type UseChatStreamReturn = {
  messages: ChatMessage[];
  isPending: boolean;
  error: string | null;
  sendMessage: (content: string, opts?: { skipOptimisticUser?: boolean; replyToExisting?: boolean }) => void;
  retry: () => void;
};

// ---------------------------------------------------------------------------
// Reducer – processes stream events into the messages array
// ---------------------------------------------------------------------------

export function reduceStreamEvent(
  messages: ChatMessage[],
  event: AiChatStreamEvent,
  userName: string,
): ChatMessage[] {
  switch (event.type) {
    case "messages": {
      // The server persisted both messages – replace optimistic placeholders
      const userMsg = toChatMessage(
        mapAiMessageToChatMessage(event.userMessage, userName),
      );
      const assistantMsg = toChatMessage(
        mapAiMessageToChatMessage(event.assistantMessage, userName),
      );

      // Remove any optimistic user message AND any existing message with the same ID
      // (prevents duplicates when the fetched history already contains the user message)
      const incomingIds = new Set<string>();
      if (userMsg) incomingIds.add(userMsg.id);
      if (assistantMsg) incomingIds.add(assistantMsg.id);

      const withoutDuplicates = messages.filter(
        (m) => m.id !== "optimistic-user" && !incomingIds.has(m.id),
      );

      const result = [...withoutDuplicates];
      if (userMsg) result.push(userMsg);
      if (assistantMsg) result.push(assistantMsg);

      return result;
    }

    case "delta": {
      // Append content to the last assistant message
      const last = messages[messages.length - 1];
      if (!last || last.role !== "assistant") return messages;

      return [
        ...messages.slice(0, -1),
        { ...last, content: last.content + event.value },
      ];
    }

    case "meta": {
      // Update title/model on the last assistant message (informational)
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== "assistant") return messages;

      return [...messages.slice(0, -1), { ...lastMsg }];
    }

    case "done": {
      // Mark the last assistant message as no longer pending
      const lastDone = messages[messages.length - 1];
      if (!lastDone || lastDone.role !== "assistant") return messages;

      return [
        ...messages.slice(0, -1),
        { ...lastDone, pending: false },
      ];
    }

    case "error": {
      // Mark the last assistant message as errored, or create one
      const lastErr = messages[messages.length - 1];
      if (lastErr && lastErr.role === "assistant") {
        return [
          ...messages.slice(0, -1),
          {
            ...lastErr,
            content: event.message,
            isError: true,
            pending: false,
          },
        ];
      }

      return [
        ...messages,
        {
          id: createMessageId(),
          role: "assistant",
          content: event.message,
          isError: true,
          pending: false,
        },
      ];
    }

    case "conversation":
    case "status":
    case "debug":
      // These events don't affect message display
      return messages;

    default:
      return messages;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatStream(params: UseChatStreamParams): UseChatStreamReturn {
  const { conversationId, businessSlug, surface, entityId, userName = "You" } = params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Abort any in-flight stream
  const abortStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Fetch initial messages on mount
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function loadMessages() {
      try {
        setIsLoading(true);
        setError(null);

        const page = await fetchMessagePage({ conversationId });

        if (cancelled) return;

        const mapped: ChatMessage[] = page.messages
          .map((m) => toChatMessage(mapAiMessageToChatMessage(m, userName)))
          .filter((m): m is ChatMessage => m !== null);

        setMessages(mapped);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load messages.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [conversationId, userName]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortStream();
    };
  }, [abortStream]);

  // Send a message and consume the SSE stream
  const sendMessage = useCallback(
    async (content: string, opts?: { skipOptimisticUser?: boolean; replyToExisting?: boolean }) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      // Store for retry
      lastUserMessageRef.current = trimmed;

      // Abort any previous stream
      abortStream();

      setError(null);
      setIsPending(true);

      // Optimistic user message (unless skipped for pending messages from dashboard)
      if (!opts?.skipOptimisticUser) {
        const optimisticUser: ChatMessage = {
          id: "optimistic-user",
          role: "user",
          content: trimmed,
          pending: true,
        };
        setMessages((prev) => [...prev, optimisticUser]);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessSlug,
            conversationId,
            surface,
            entityId,
            message: trimmed,
            ...(opts?.replyToExisting && { replyToExisting: true }),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMessage = "The assistant could not respond. Please try again.";
          try {
            const payload = (await response.json()) as { error?: string };
            if (payload.error) errorMessage = payload.error;
          } catch {
            // Use default error message
          }
          throw new Error(errorMessage);
        }

        await consumeStream(response, (event) => {
          if (!mountedRef.current) return;
          setMessages((prev) => reduceStreamEvent(prev, event, userName));
        });

        if (mountedRef.current) {
          setIsPending(false);
        }
      } catch (err) {
        if (!mountedRef.current) return;

        // Don't treat abort as an error
        if (err instanceof DOMException && err.name === "AbortError") {
          setIsPending(false);
          return;
        }

        const message =
          err instanceof Error ? err.message : "Connection lost. Please try again.";

        // Add or update error in messages
        setMessages((prev) =>
          reduceStreamEvent(
            prev,
            { type: "error", message },
            userName,
          ),
        );
        setIsPending(false);
        setError(message);
      }
    },
    [abortStream, businessSlug, conversationId, entityId, surface, userName],
  );

  // Retry the last user message
  const retry = useCallback(() => {
    if (lastUserMessageRef.current) {
      // Remove error messages before retrying
      setMessages((prev) =>
        prev.filter((m) => !m.isError),
      );
      setError(null);
      sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  return {
    messages,
    isPending: isPending || isLoading,
    error,
    sendMessage,
    retry,
  };
}
