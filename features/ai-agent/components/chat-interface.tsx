"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageSquare } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MadeWithRequo } from "@/components/shared/made-with-requo";
import { createAgentSessionAction } from "@/features/ai-agent/actions";
import { ChatInput } from "@/features/ai-agent/components/chat-input";
import { ChatMessage } from "@/features/ai-agent/components/chat-message";

interface ChatInterfaceProps {
  businessSlug: string;
  businessName: string;
  /** Optional short description shown in the header */
  businessDescription?: string | null;
  /** Show the "Made with Requo" watermark (false when plan removed it) */
  showWatermark?: boolean;
  /** Link to the traditional inquiry form as a fallback capture path */
  fallbackFormHref?: string;
}

// --------------------------------------------------------------------------
// Session storage key
// --------------------------------------------------------------------------

function sessionKey(slug: string) {
  return `requo-agent-session:${slug}`;
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

/**
 * Full-page chat interface for the public chat.
 *
 * Responsibilities:
 * - Initialise (or resume) a session via the server action
 * - Rehydrate the customer's own transcript so a reload restores it
 * - Render the message list with streaming support over the UI transport
 * - Send messages to /api/ai/agent/chat and stream the response
 */
export function ChatInterface({
  businessSlug,
  businessName,
  businessDescription,
  showWatermark = false,
  fallbackFormHref,
}: ChatInterfaceProps) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null,
  );
  const [sessionError, setSessionError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Session initialisation + transcript rehydration
  // -------------------------------------------------------------------------

  useEffect(() => {
    async function init() {
      // Try to restore a previous session for this business
      const stored =
        typeof window !== "undefined"
          ? sessionStorage.getItem(sessionKey(businessSlug))
          : null;

      let token = stored;

      if (!token) {
        // Create a fresh session
        const result = await createAgentSessionAction({
          businessSlug,
          metadata: {
            userAgent:
              typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          },
        });

        if (!result.success) {
          setSessionError(
            result.error ?? "Unable to start a conversation. Please try again.",
          );
          setInitialMessages([]);
          return;
        }

        token = result.sessionToken;
        sessionStorage.setItem(sessionKey(businessSlug), token);
      }

      setSessionToken(token);

      // Rehydrate the customer's own transcript (token-possession auth).
      try {
        const response = await fetch(
          `/api/ai/agent/session?token=${encodeURIComponent(token)}`,
        );
        if (response.ok) {
          const data = await response.json();
          const rows = Array.isArray(data.messages) ? data.messages : [];
          setInitialMessages(
            rows.map(
              (row: { id: string; role: "user" | "assistant"; content: string }) => ({
                id: row.id,
                role: row.role,
                parts: [{ type: "text", text: row.content }],
              }),
            ),
          );
        } else {
          // Token expired or unknown — drop it so the next visit starts fresh.
          sessionStorage.removeItem(sessionKey(businessSlug));
          setInitialMessages([]);
        }
      } catch {
        setInitialMessages([]);
      }
    }

    void init();
  }, [businessSlug]);

  if (!sessionToken || initialMessages === null) {
    return (
      <ChatShell
        businessSlug={businessSlug}
        businessName={businessName}
        businessDescription={businessDescription}
        showWatermark={showWatermark}
        fallbackFormHref={fallbackFormHref}
        sessionError={sessionError}
        ready={false}
      >
        {/* Empty state — shown while session is initialising */}
        {!sessionError && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-full bg-muted"
            >
              <MessageSquare className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Starting conversation…</p>
          </div>
        )}
      </ChatShell>
    );
  }

  return (
    <ChatReady
      businessSlug={businessSlug}
      businessName={businessName}
      businessDescription={businessDescription}
      showWatermark={showWatermark}
      fallbackFormHref={fallbackFormHref}
      sessionToken={sessionToken}
      initialMessages={initialMessages}
      onSessionInvalid={() => {
        sessionStorage.removeItem(sessionKey(businessSlug));
        setSessionToken(null);
        setInitialMessages(null);
        setSessionError("This conversation expired. Starting a new one…");
        setTimeout(() => window.location.reload(), 1200);
      }}
    />
  );
}

function ChatReady({
  businessSlug,
  businessName,
  businessDescription,
  showWatermark,
  fallbackFormHref,
  sessionToken,
  initialMessages,
  onSessionInvalid,
}: ChatInterfaceProps & {
  sessionToken: string;
  initialMessages: UIMessage[];
  onSessionInvalid: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/agent/chat",
        body: { sessionToken },
      }),
    [sessionToken],
  );

  const { messages, sendMessage, status, error: chatError, clearError } =
    useChat<UIMessage>({
      id: sessionToken,
      messages: initialMessages,
      transport,
    });

  const isStreaming = status === "submitted" || status === "streaming";

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!chatError) return;
    if (
      chatError.message.includes("Invalid or expired session") ||
      chatError.message.includes("not enabled") ||
      chatError.message.includes("not available on this plan")
    ) {
      onSessionInvalid();
    }
  }, [chatError, onSessionInvalid]);

  const handleSend = (content: string) => {
    if (isStreaming) return;
    clearError();
    void sendMessage({ text: content });
  };

  const viewMessages = messages.map((message) => ({
    id: message.id,
    role: message.role as "user" | "assistant",
    content: (message.parts ?? [])
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
  }));

  const streamingId =
    isStreaming && messages.length > 0
      ? messages[messages.length - 1].id
      : null;

  return (
    <ChatShell
      businessSlug={businessSlug}
      businessName={businessName}
      businessDescription={businessDescription}
      showWatermark={showWatermark}
      fallbackFormHref={fallbackFormHref}
      ready
    >
      {/* Empty state */}
      {viewMessages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <div
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-full bg-muted"
          >
            <MessageSquare className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{`Chat with ${businessName}`}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us what you&apos;re looking for and we&apos;ll get back to you.
            </p>
            {fallbackFormHref && (
              <Link
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                href={fallbackFormHref}
              >
                Prefer to use the inquiry form instead?
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex flex-col gap-4">
        {viewMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isStreaming={msg.role === "assistant" && msg.id === streamingId}
          />
        ))}
      </div>

      {/* Send error */}
      {chatError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            {chatError.message || "Something went wrong. Please try again."}
          </AlertDescription>
        </Alert>
      )}

      <div ref={bottomRef} aria-hidden="true" />

      {/* Input */}
      <div className="sticky bottom-0 -mx-4 bg-background px-4 pb-4 pt-2 sm:-mx-6 sm:px-6">
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={isStreaming ? "Waiting for response…" : "Type your message…"}
        />
      </div>
    </ChatShell>
  );
}

function ChatShell({
  businessName,
  businessDescription,
  showWatermark,
  fallbackFormHref,
  sessionError,
  ready,
  children,
}: Pick<
  ChatInterfaceProps,
  "businessName" | "businessDescription" | "showWatermark" | "fallbackFormHref"
> & {
  businessSlug: string;
  sessionError?: string | null;
  ready?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3 sm:px-6">
        <div
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <MessageSquare className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {businessName}
          </p>
          {businessDescription ? (
            <p className="truncate text-xs text-muted-foreground">
              {businessDescription}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Chat with us</p>
          )}
        </div>
        {fallbackFormHref && (
          <Button
            asChild
            className="ml-auto shrink-0"
            size="sm"
            type="button"
            variant="outline"
          >
            <Link href={fallbackFormHref}>Use inquiry form</Link>
          </Button>
        )}
      </header>

      {/* Message list */}
      <main
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
        aria-label="Conversation"
        aria-live="polite"
        aria-atomic="false"
      >
        {sessionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{sessionError}</AlertDescription>
          </Alert>
        )}

        {children}
      </main>

      {showWatermark ? (
        <MadeWithRequo className="bottom-20 right-4 sm:right-6" />
      ) : null}

      {!ready && <div aria-hidden="true" />}
    </div>
  );
}
