"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

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
import { resolveEntityConversationAction } from "@/features/ai/actions";
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
 */
export function AiChatPanel({
  businessSlug,
  surface,
  entityId,
  entityTitle,
  userName,
}: AiChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedRef = useRef(false);

  // Resolve conversation on first open
  useEffect(() => {
    if (!open || resolvedRef.current) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading indicator for async fetch
    setLoading(true);
    setError(null);

    resolveEntityConversationAction({
      businessSlug,
      surface,
      entityId,
      title: entityTitle,
    })
      .then((result) => {
        if (cancelled) return;
        setConversationId(result.conversationId);
        resolvedRef.current = true;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load the AI assistant.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, businessSlug, surface, entityId, entityTitle]);

  const panelTitle =
    surface === "inquiry" ? "Inquiry assistant" : "Quote assistant";
  const panelDescription =
    surface === "inquiry"
      ? "AI with full context of this inquiry."
      : "AI with full context of this quote.";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
          <SheetTitle>{panelTitle}</SheetTitle>
          <SheetDescription>{panelDescription}</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex-1 overflow-hidden p-0">
          {loading ? (
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
                  onClick={() => {
                    resolvedRef.current = false;
                    setLoading(true);
                    setError(null);
                    resolveEntityConversationAction({
                      businessSlug,
                      surface,
                      entityId,
                      title: entityTitle,
                    })
                      .then((result) => {
                        setConversationId(result.conversationId);
                        resolvedRef.current = true;
                      })
                      .catch((err) => {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Could not load the AI assistant.",
                        );
                      })
                      .finally(() => setLoading(false));
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : conversationId ? (
            <PendingMessageProvider>
              <ChatPageView
                businessSlug={businessSlug}
                conversationId={conversationId}
                userName={userName}
                surface={surface}
                entityId={entityId}
                hideHeader
              />
            </PendingMessageProvider>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
