"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Wrench } from "lucide-react";
import type { BusinessPlan } from "@/lib/plans/plans";
import { ToolResultRenderer } from "@/features/owner-assistant/components/tool-result-cards";
import {
  confirmAssistantToolAction,
  deleteAssistantSessionAction,
} from "@/features/owner-assistant/actions";
import { UpgradePrompt } from "@/features/paywall/components/upgrade-prompt";
import {
  historyToUIMessages,
  type AssistantHistoryRow,
} from "@/features/owner-assistant/components/message-mapping";

type OwnerAssistantChatProps = {
  businessSlug: string;
  businessId: string;
  userId: string;
  plan: BusinessPlan;
  sessionId: string;
  initialMessages: AssistantHistoryRow[];
  /** Pre-filled prompt (e.g. from the dashboard home box) sent once on arrival. */
  autoPrompt?: string | null;
};

const TOOL_LABELS: Record<string, string> = {
  search_inquiries: "Searching inquiries",
  get_inquiry_stats: "Calculating inquiry stats",
  search_quotes: "Searching quotes",
  get_quote_stats: "Calculating quote stats",
  search_customers: "Searching customers",
  get_conversion_analytics: "Calculating conversion",
  search_knowledge: "Searching knowledge base",
  get_follow_up_stats: "Checking follow-ups",
  create_inquiry: "Creating inquiry",
  create_quote: "Creating quote",
  update_inquiry_status: "Preparing status change",
  send_quote: "Preparing to send quote",
};

function toolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? `Using ${toolName}`;
}

export function OwnerAssistantChat({
  businessSlug,
  businessId,
  userId,
  plan,
  sessionId,
  initialMessages,
  autoPrompt,
}: OwnerAssistantChatProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const cleanedEmptyRef = useRef(false);
  const autoSentRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const limitFetch: typeof fetch = useCallback(
    async (requestInput, requestInit) => {
      const response = await fetch(requestInput, requestInit);
      if (response.status === 429) {
        const data = await response
          .clone()
          .json()
          .catch(() => null);
        if (data && typeof data === "object" && "upgradeRequired" in data) {
          setLimitMessage(
            typeof data.error === "string"
              ? data.error
              : "You've reached your Assistant message limit.",
          );
        }
      }
      return response;
    },
    [],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/owner-assistant/chat",
        body: { businessSlug, sessionId },
        fetch: limitFetch,
      }),
    [businessSlug, sessionId, limitFetch],
  );

  const startingMessages = useMemo(
    () => historyToUIMessages(initialMessages),
    [initialMessages],
  );

  const { messages, sendMessage, status, error, setMessages, stop } =
    useChat<UIMessage>({
      id: sessionId,
      messages: startingMessages,
      transport,
    });

  const isLoading = status === "submitted" || status === "streaming";

  const refreshFromSession = useCallback(async () => {
    const response = await fetch(
      `/api/ai/owner-assistant/session/${sessionId}?businessSlug=${businessSlug}`,
    );
    if (!response.ok) return;
    const data = await response.json();
    setMessages(historyToUIMessages(data.messages ?? []));
  }, [sessionId, businessSlug, setMessages]);

  // Deliver the home-box prompt without a second user action.
  useEffect(() => {
    if (!autoPrompt || autoSentRef.current || status !== "ready") return;
    if (startingMessages.length > 0) return;
    autoSentRef.current = true;
    void sendMessage({ text: autoPrompt });
    router.replace(`/${businessSlug}/assistant/chat/${sessionId}`);
  }, [
    autoPrompt,
    status,
    startingMessages.length,
    sendMessage,
    router,
    businessSlug,
    sessionId,
  ]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Tell the history sidebar to refresh once a turn completes (titles,
  // ordering) without a full page reload.
  const announcedRef = useRef(0);
  useEffect(() => {
    if (status === "ready" && messages.length > announcedRef.current) {
      announcedRef.current = messages.length;
      window.dispatchEvent(new CustomEvent("assistant:history-changed"));
    }
  }, [status, messages.length]);

  const handleSend = useCallback(
    (messageContent?: string) => {
      const content = (messageContent ?? input).trim();
      if (!content || isLoading) return;
      setInput("");
      setLimitMessage(null);
      void sendMessage({ text: content });
    },
    [input, isLoading, sendMessage],
  );

  // If the very first send fails, remove the otherwise-empty session so
  // history contains only real conversations.
  useEffect(() => {
    if (
      error &&
      startingMessages.length === 0 &&
      messages.filter((m) => m.role === "user").length <= 1 &&
      !cleanedEmptyRef.current
    ) {
      cleanedEmptyRef.current = true;
      void deleteAssistantSessionAction({ businessSlug, sessionId }).catch(
        () => {},
      );
    }
  }, [error, startingMessages.length, messages, businessSlug, sessionId]);

  const handleConfirm = useCallback(
    async (confirmationId: string) => {
      setConfirmingId(confirmationId);
      const result = await confirmAssistantToolAction({
        businessSlug,
        sessionId,
        confirmationId,
        decision: "approved",
      });
      setConfirmingId(null);
      if ("error" in result) {
        await refreshFromSession();
        return;
      }
      await refreshFromSession();
    },
    [businessSlug, sessionId, refreshFromSession],
  );

  const handleCancel = useCallback(
    async (confirmationId: string) => {
      setConfirmingId(confirmationId);
      await confirmAssistantToolAction({
        businessSlug,
        sessionId,
        confirmationId,
        decision: "rejected",
      });
      setConfirmingId(null);
      await refreshFromSession();
    },
    [businessSlug, sessionId, refreshFromSession],
  );

  const activeTool = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      for (const part of message.parts ?? []) {
        if (
          part.type === "dynamic-tool" &&
          (part.state === "input-streaming" ||
            part.state === "input-available")
        ) {
          return part.toolName;
        }
      }
      const textPart = (message.parts ?? []).find(
        (part) => part.type === "text",
      );
      if (textPart && "text" in textPart && textPart.text) break;
    }
    return null;
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Assistant</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ask about your inquiries, quotes, or business performance
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full mt-6">
              <ExamplePrompt onClick={() => handleSend("Show me this week's inquiries")}>
                Show this week&apos;s inquiries
              </ExamplePrompt>
              <ExamplePrompt onClick={() => handleSend("What's my conversion rate?")}>
                What&apos;s my conversion rate?
              </ExamplePrompt>
              <ExamplePrompt onClick={() => handleSend("Find quotes over $5000")}>
                Find quotes over $5000
              </ExamplePrompt>
              <ExamplePrompt onClick={() => handleSend("How many new inquiries this month?")}>
                New inquiries this month
              </ExamplePrompt>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessageView
                key={message.id}
                message={message}
                businessSlug={businessSlug}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                confirming={confirmingId !== null}
              />
            ))}
          </>
        )}

        {isLoading && activeTool && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              <Wrench className="size-4 animate-pulse" aria-hidden />
              <span>
                {toolLabel(activeTool)}
                {"…"}
              </span>
            </div>
          </div>
        )}

        {limitMessage && (
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <UpgradePrompt
                variant="card"
                size="md"
                description={limitMessage}
                plan={plan}
                upgradeAction={{ userId, businessId, businessSlug, currentPlan: plan }}
              />
            </div>
          </div>
        )}

        {error && !limitMessage && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm max-w-[80%]">
              {error.message || "Something went wrong. Please try again."}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about inquiries, quotes, or create records..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
            aria-label="Message the assistant"
          />
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <Button onClick={() => stop()} variant="outline" size="icon" aria-label="Stop generating">
                <span className="size-3 rounded-sm bg-current" aria-hidden />
              </Button>
            ) : (
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                size="icon"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessageView({
  message,
  businessSlug,
  onConfirm,
  onCancel,
  confirming,
}: {
  message: UIMessage;
  businessSlug: string;
  onConfirm: (confirmationId: string) => void;
  onCancel: (confirmationId: string) => void;
  confirming: boolean;
}) {
  if (message.role !== "user" && message.role !== "assistant") return null;

  const textParts = (message.parts ?? []).filter(
    (part) => part.type === "text",
  );
  const toolParts = (message.parts ?? []).filter(
    (part) => part.type === "dynamic-tool",
  );

  // Skip assistant messages that only carry in-flight tool calls without output.
  const hasVisibleContent =
    textParts.some((part) => part.type === "text" && part.text.trim()) ||
    toolParts.some(
      (part) =>
        part.type === "dynamic-tool" && part.state === "output-available",
    );
  if (!hasVisibleContent) return null;

  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      {textParts.map((part, index) =>
        part.type === "text" && part.text ? (
          <div
            key={`${message.id}-text-${index}`}
            className={`max-w-[80%] rounded-lg px-4 py-3 ${
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <div className="whitespace-pre-wrap break-words">{part.text}</div>
          </div>
        ) : null,
      )}
      {toolParts.map((part) => {
        if (part.type !== "dynamic-tool" || part.state !== "output-available") {
          return null;
        }
        const output = part.output as {
          type?: string;
          summary?: string;
          confirmationId?: string;
        } | null;
        if (!output || typeof output !== "object" || !output.type) return null;
        return (
          <div key={part.toolCallId} className="w-full max-w-2xl">
            <ToolResultRenderer
              result={
                output as unknown as Parameters<
                  typeof ToolResultRenderer
                >[0]["result"]
              }
              businessSlug={businessSlug}
              onConfirm={confirming ? () => {} : onConfirm}
              onCancel={confirming ? () => {} : onCancel}
            />
          </div>
        );
      })}
    </div>
  );
}

function ExamplePrompt({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-3 text-left rounded-lg border border-border/60 bg-muted/25 hover:bg-muted/40 transition-colors text-sm"
    >
      {children}
    </button>
  );
}
