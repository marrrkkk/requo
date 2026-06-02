"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RotateCcw, Sparkles } from "lucide-react";
import type { UIMessage } from "ai";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PendingMessageProvider } from "@/features/ai/chat-ui/pending-message-context";
import {
  resolveEntityConversationAction,
  resetEntityConversationAction,
} from "@/features/ai/actions";
import type { AiSurface } from "@/features/ai/types";

const ChatPageView = dynamic(
  () =>
    import("@/features/ai/chat-ui/chat-page-view").then(
      (mod) => mod.ChatPageView,
    ),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="size-6 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading assistant...</p>
        </div>
      </div>
    ),
  },
);

type ResolvedConversation = {
  conversationId: string;
  initialMessages: UIMessage[];
  failedMessageIds: string[];
  toolCallsByMessageId: Record<string, string[]>;
  structuredOutputsByMessageId: Record<string, unknown[]>;
  actionProposalsByMessageId: Record<string, unknown[]>;
};

type AiChatPanelProps = {
  businessSlug: string;
  surface: Extract<AiSurface, "inquiry" | "quote">;
  entityId: string;
  entityTitle: string;
  userName: string;
};

/**
 * A Sheet-based AI chat panel for inquiry and quote detail pages.
 * Lazy-loads the chat view and resolves the conversation on first open.
 * Keeps resolved state across open/close so history persists without re-fetching.
 */
export function AiChatPanel({
  businessSlug,
  surface,
  entityId,
  entityTitle,
  userName,
}: AiChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<ResolvedConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track the render key so we can force ChatPageView to remount with fresh
  // initialMessages on each open (since useChat seeds from initialMessages
  // only on mount).
  const [renderKey, setRenderKey] = useState(0);
  const conversationIdRef = useRef<string | null>(null);

  const resolve = useCallback(() => {
    setLoading(true);
    setError(null);

    resolveEntityConversationAction({
      businessSlug,
      surface,
      entityId,
      title: entityTitle,
    })
      .then((result) => {
        conversationIdRef.current = result.conversationId;
        setResolved({
          conversationId: result.conversationId,
          initialMessages: result.initialMessages as UIMessage[],
          failedMessageIds: result.failedMessageIds,
          toolCallsByMessageId: result.toolCallsByMessageId,
          structuredOutputsByMessageId: result.structuredOutputsByMessageId,
          actionProposalsByMessageId: result.actionProposalsByMessageId,
        });
        setRenderKey((k) => k + 1);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load the AI assistant.",
        );
      })
      .finally(() => setLoading(false));
  }, [businessSlug, surface, entityId, entityTitle]);

  const handleStartFresh = useCallback(() => {
    const currentId = conversationIdRef.current;
    if (!currentId) return;

    setResetting(true);

    resetEntityConversationAction({
      businessSlug,
      surface,
      entityId,
      conversationId: currentId,
      title: entityTitle,
    })
      .then((result) => {
        conversationIdRef.current = result.conversationId;
        setResolved({
          conversationId: result.conversationId,
          initialMessages: [],
          failedMessageIds: [],
          toolCallsByMessageId: {},
          structuredOutputsByMessageId: {},
          actionProposalsByMessageId: {},
        });
        setRenderKey((k) => k + 1);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Could not reset the conversation.",
        );
      })
      .finally(() => setResetting(false));
  }, [businessSlug, surface, entityId, entityTitle]);

  // Resolve on every open to get fresh messages.
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        resolve();
      }
    },
    [resolve],
  );

  const panelTitle =
    surface === "inquiry" ? "Inquiry assistant" : "Quote assistant";
  const panelDescription =
    surface === "inquiry"
      ? "AI with full context of this inquiry."
      : "AI with full context of this quote.";

  const hasMessages =
    resolved && resolved.initialMessages.length > 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Sparkles data-icon="inline-start" className="size-4" />
          Ask AI
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 data-[side=right]:sm:max-w-lg data-[side=right]:lg:max-w-xl"
        showCloseButton
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <SheetTitle>{panelTitle}</SheetTitle>
              <SheetDescription>{panelDescription}</SheetDescription>
            </div>
            {hasMessages && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleStartFresh}
                disabled={resetting}
                title="Start fresh conversation"
                className="shrink-0"
              >
                <RotateCcw
                  className={resetting ? "animate-spin" : undefined}
                />
                <span className="sr-only">Start fresh</span>
              </Button>
            )}
          </div>
        </SheetHeader>
        <SheetBody className="flex-1 overflow-hidden p-0">
          {loading && !resolved ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="size-6 animate-pulse text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Starting assistant...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm font-medium text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resolve()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : resolved ? (
            <PendingMessageProvider>
              <ChatPageView
                key={renderKey}
                businessSlug={businessSlug}
                conversationId={resolved.conversationId}
                userName={userName}
                surface={surface}
                entityId={entityId}
                hideHeader
                initialMessages={resolved.initialMessages}
                failedMessageIds={resolved.failedMessageIds}
                toolCallsByMessageId={resolved.toolCallsByMessageId}
                structuredOutputsByMessageId={
                  resolved.structuredOutputsByMessageId
                }
                actionProposalsByMessageId={
                  resolved.actionProposalsByMessageId
                }
              />
            </PendingMessageProvider>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
