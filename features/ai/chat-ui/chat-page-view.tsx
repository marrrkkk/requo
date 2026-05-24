"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container";
import { ScrollButton } from "@/components/prompt-kit/scroll-button";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input";
import { ChatMessageList, type ChatMessage, type ChatMessageStep } from "./chat-message-list";
import { ChatHeaderBar } from "./chat-header-bar";
import { DevModelSelector } from "./dev-model-selector";
import { autoAiModelOptionValue } from "@/lib/ai/model-options";
import {
  isStructuredToolOutput,
  StructuredDataCard,
  type StructuredToolOutput,
} from "./chat-data-cards";
import {
  parseActionProposals,
  stripActionProposals,
  type AiActionProposal,
} from "@/features/ai/components/ai-action-button";
import { usePendingMessage } from "./pending-message-context";
import {
  aiQuickActions,
  getPanelPlaceholder,
} from "@/features/ai/components/ai-chat-helpers";
import type { AiSurface } from "@/features/ai/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatPageViewProps = {
  businessSlug: string;
  conversationId: string;
  userName: string;
  surface?: AiSurface;
  entityId?: string;
  /**
   * Persisted history hydrated by the server page. Ordered oldest -> newest.
   * Allows a refresh to restore prior turns instead of starting empty.
   */
  initialMessages?: UIMessage[];
  /**
   * IDs of assistant messages that have `status: "failed"` in the DB.
   * Used to render them with error styling on initial load.
   */
  failedMessageIds?: string[];
  /**
   * Tool call names per message ID from DB metadata.
   * Used to reconstruct steps display on refresh.
   */
  toolCallsByMessageId?: Record<string, string[]>;
  /**
   * Structured tool outputs per message ID from DB metadata.
   * Used to render data cards on refresh.
   */
  structuredOutputsByMessageId?: Record<string, unknown[]>;
  /**
   * Action proposals per message ID from DB metadata.
   * Used to render confirm/decline action cards on refresh.
   */
  actionProposalsByMessageId?: Record<string, unknown[]>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMessageText(message: UIMessage): string {
  if (!message.parts) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function getMessageSteps(message: UIMessage): ChatMessageStep[] {
  if (!message.parts) return [];
  const steps: ChatMessageStep[] = [];
  for (const p of message.parts) {
    // Static tools have type "tool-<name>", dynamic tools have type "dynamic-tool"
    if ("toolCallId" in p && "state" in p) {
      const toolCallId = (p as { toolCallId: string }).toolCallId;
      const state = (p as { state: string }).state;
      let toolName: string;

      if (p.type === "dynamic-tool" && "toolName" in p) {
        toolName = (p as { toolName: string }).toolName;
      } else if (p.type.startsWith("tool-")) {
        toolName = p.type.slice(5); // Remove "tool-" prefix
      } else {
        continue;
      }

      steps.push({
        id: toolCallId,
        name: toolName,
        label: toolName.replace(/_/g, " "),
        state: state === "output-available" || state === "output-error" || state === "output-denied"
          ? "completed"
          : "running",
      });
    }
  }
  return steps;
}

/** Extract structured tool outputs from message parts. */
function getStructuredOutputs(message: UIMessage): StructuredToolOutput[] {
  if (!message.parts) return [];
  const outputs: StructuredToolOutput[] = [];
  for (const p of message.parts) {
    if ("toolCallId" in p && "state" in p) {
      const state = (p as { state: string }).state;
      if (state === "output-available" && "output" in p) {
        const output = (p as { output: unknown }).output;
        // Check if it's a structured result (has text + structured fields)
        if (typeof output === "object" && output !== null && "structured" in output) {
          const structured = (output as { structured: unknown }).structured;
          if (isStructuredToolOutput(structured)) {
            outputs.push(structured);
          }
        }
      }
    }
  }
  return outputs;
}

/** Extract action proposals from tool outputs (action tools return [ACTION_PROPOSAL]...[/ACTION_PROPOSAL] strings). */
function getActionProposals(message: UIMessage): AiActionProposal[] {
  if (!message.parts) return [];
  const proposals: AiActionProposal[] = [];
  for (const p of message.parts) {
    if ("toolCallId" in p && "state" in p) {
      const state = (p as { state: string }).state;
      if (state === "output-available" && "output" in p) {
        const output = (p as { output: unknown }).output;
        if (typeof output === "string" && output.includes("[ACTION_PROPOSAL]")) {
          proposals.push(...parseActionProposals(output));
        }
      }
    }
  }
  return proposals;
}

function parseErrorMessage(error: Error): string {
  const raw = error.message;
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // Not JSON
  }
  return raw || "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatPageView({
  businessSlug,
  conversationId,
  userName,
  surface = "dashboard",
  entityId = "global",
  initialMessages,
  failedMessageIds,
  toolCallsByMessageId,
  structuredOutputsByMessageId,
  actionProposalsByMessageId,
}: ChatPageViewProps) {
  const [inputValue, setInputValue] = useState("");
  const [devModel, setDevModel] = useState(autoAiModelOptionValue);
  const { consumePendingMessage } = usePendingMessage();
  const hasHandledInitialTurn = useRef(false);

  const failedIds = useMemo(
    () => new Set(failedMessageIds ?? []),
    [failedMessageIds],
  );

  // Disable page-level scroll while chat is mounted.
  // Cleaned up on unmount so navigating away restores normal scrolling.
  useEffect(() => {
    const scrollParent = document.querySelector<HTMLElement>(
      '[data-slot="sidebar-inset"]',
    );
    if (!scrollParent) return;
    scrollParent.style.overflow = "hidden";
    return () => {
      scrollParent.style.overflow = "";
    };
  }, []);

  // AI SDK v6 transport
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        body: {
          businessSlug,
          conversationId,
          surface,
          entityId,
          ...(devModel !== autoAiModelOptionValue && { devModel }),
        },
      }),
    [businessSlug, conversationId, surface, entityId, devModel],
  );

  // Seed useChat with persisted history. The hook treats `messages` as the
  // initial state, so subsequent turns appended via sendMessage/regenerate
  // continue from this list.
  const seededMessages = useMemo(
    () => initialMessages ?? [],
    [initialMessages],
  );

  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport,
    messages: seededMessages,
    onError: () => {},
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Handle the dashboard "Ask AI" → new conversation handoff.
  //
  // `startNewChat` already persisted the user message in the DB before
  // navigating here, so the seeded history ends with that user message.
  // Trigger an assistant reply by regenerating from it (which sends
  // `replyToExisting: true`) instead of calling `sendMessage` with the same
  // text — that would create a duplicate user row server-side.
  //
  // If the seeded history already ends with an assistant message (even an
  // empty `generating` one), the AI was already triggered — do nothing.
  //
  // On a plain refresh of an existing conversation, no pending message is
  // set, so we just render the history without auto-triggering anything.
  useEffect(() => {
    if (hasHandledInitialTurn.current) return;
    if (isStreaming) return;

    const pending = consumePendingMessage();
    if (!pending) {
      hasHandledInitialTurn.current = true;
      return;
    }

    const lastMessage = seededMessages[seededMessages.length - 1];
    hasHandledInitialTurn.current = true;

    if (lastMessage?.role === "user") {
      // The user message is persisted but no assistant reply yet.
      // Trigger the AI response via regenerate (replyToExisting avoids
      // creating a duplicate user message server-side).
      void regenerate({
        messageId: lastMessage.id,
        body: { replyToExisting: true },
      });
    }
    // If lastMessage is assistant (generating/completed), the AI was already
    // triggered or completed. Nothing to do — just show whatever we have.
  }, [consumePendingMessage, isStreaming, regenerate, seededMessages]);

  // Convert UIMessage[] to display format
  const displayMessages: ChatMessage[] = messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        // Don't show empty assistant messages (interrupted streams with no content)
        // unless they have tool calls (steps to show)
        !(m.role === "assistant" && !getMessageText(m) && getMessageSteps(m).length === 0),
    )
    .map((m) => {
      // Get steps from live SDK parts (streaming) or from persisted metadata (refresh)
      let steps: ChatMessageStep[] | undefined;
      if (m.role === "assistant") {
        const liveSteps = getMessageSteps(m);
        if (liveSteps.length > 0) {
          steps = liveSteps;
        } else if (toolCallsByMessageId?.[m.id]) {
          steps = toolCallsByMessageId[m.id].map((name, i) => ({
            id: `${m.id}-tool-${i}`,
            name,
            label: name.replace(/_/g, " "),
            state: "completed" as const,
          }));
        }
      }

      const content = getMessageText(m);

      // Strip any ACTION_PROPOSAL blocks that might leak into text content
      const displayContent = content.includes("[ACTION_PROPOSAL]")
        ? stripActionProposals(content)
        : content;

      return {
        id: m.id,
        role: m.role as "user" | "assistant",
        content: displayContent,
        pending:
          m.role === "assistant" &&
          isStreaming &&
          m === messages[messages.length - 1],
        isError: failedIds.has(m.id),
        steps,
        structuredData: m.role === "assistant"
          ? (() => {
              const liveOutputs = getStructuredOutputs(m);
              if (liveOutputs.length > 0) return liveOutputs;
              // Fallback to persisted metadata on refresh
              const persisted = structuredOutputsByMessageId?.[m.id];
              if (persisted && persisted.length > 0) {
                return persisted.filter(isStructuredToolOutput);
              }
              return undefined;
            })()
          : undefined,
        actionProposals: m.role === "assistant"
          ? (() => {
              const proposals = getActionProposals(m);
              if (proposals.length > 0) return proposals;
              // Fallback to persisted metadata on refresh
              const persisted = actionProposalsByMessageId?.[m.id];
              if (persisted && persisted.length > 0) {
                return persisted.filter(
                  (p): p is AiActionProposal =>
                    typeof p === "object" &&
                    p !== null &&
                    "action" in p &&
                    "businessSlug" in p &&
                    "payload" in p,
                );
              }
              return undefined;
            })()
          : undefined,
      };
    });

  // Add error as inline message
  const errorMessage = error ? parseErrorMessage(error) : null;

  // Detect "unanswered" state: messages exist but the last one is from the
  // user and no stream is active. This happens after refresh when the AI
  // failed (429, error, interrupted stream) and no assistant row was persisted.
  const lastDisplayMsg = displayMessages[displayMessages.length - 1];
  const isUnanswered =
    !isStreaming &&
    !errorMessage &&
    displayMessages.length > 0 &&
    lastDisplayMsg?.role === "user" &&
    !lastDisplayMsg?.isError;

  const allMessages: ChatMessage[] = [
    ...displayMessages,
    ...(errorMessage
      ? [
          {
            id: "error",
            role: "assistant" as const,
            content: errorMessage,
            pending: false,
            isError: true,
          },
        ]
      : []),
    ...(isUnanswered
      ? [
          {
            id: "unanswered",
            role: "assistant" as const,
            content:
              "The response wasn\u2019t saved. Tap retry to ask again.",
            pending: false,
            isError: true,
          },
        ]
      : []),
  ];

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    sendMessage({ parts: [{ type: "text", text }] });
  }, [inputValue, isStreaming, sendMessage]);

  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (isStreaming) return;
      sendMessage({ parts: [{ type: "text", text: prompt }] });
    },
    [isStreaming, sendMessage],
  );

  // Retry handler: regenerate from the last user message without creating
  // a duplicate row (replyToExisting tells the server to reuse it).
  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMsg || isStreaming) return;
    void regenerate({
      messageId: lastUserMsg.id,
      body: { replyToExisting: true },
    });
  }, [messages, isStreaming, regenerate]);

  const quickActions = aiQuickActions[surface];

  return (
    <div className="flex h-full flex-col overflow-hidden" data-chat-page>
      {/* Header with new chat, history, and more buttons */}
      <ChatHeaderBar
        businessSlug={businessSlug}
        conversationId={conversationId}
      />

      {/* Messages area — centered with margins, only this area scrolls */}
      <ChatContainerRoot className="flex-1 overflow-hidden">
        <ChatContainerContent className="justify-end">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
            {allMessages.length === 0 && !isStreaming ? (
              <EmptyState
                quickActions={quickActions}
                onAction={handleQuickAction}
              />
            ) : (
              <ChatMessageList
                messages={allMessages}
                rawMessages={messages}
                userName={userName}
                isPending={isStreaming}
                onRetry={handleRetry}
                error={null}
              />
            )}
          </div>
          <ChatContainerScrollAnchor />
        </ChatContainerContent>

        {/* Scroll-to-bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2">
          <div className="pointer-events-auto">
            <ScrollButton variant="outline" />
          </div>
        </div>
      </ChatContainerRoot>

      {/* Input area — centered, prompt-kit style */}
      <div className="shrink-0 pb-6">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <PromptInput
            value={inputValue}
            onValueChange={setInputValue}
            onSubmit={handleSend}
            isLoading={isStreaming}
            className="rounded-2xl border border-border bg-background"
          >
            <PromptInputTextarea
              placeholder={getPanelPlaceholder(surface)}
              className="min-h-[44px] text-sm"
            />
            <PromptInputActions className="justify-between pt-1">
              <DevModelSelector value={devModel} onChange={setDevModel} />
              <PromptInputAction tooltip="Send message">
                <Button
                  variant="default"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isStreaming}
                  type="button"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  quickActions,
  onAction,
}: {
  quickActions: { label: string; prompt: string }[];
  onAction: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="size-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-foreground">How can I help?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about your inquiries, quotes, follow-ups, or business data.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            size="sm"
            onClick={() => onAction(action.prompt)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
