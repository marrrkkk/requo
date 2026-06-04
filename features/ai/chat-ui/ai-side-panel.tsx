"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RequoIcon } from "@/components/shared/requo-icon";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMdScreen } from "@/hooks/use-md-screen";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input";
import { PendingMessageProvider } from "@/features/ai/chat-ui/pending-message-context";
import { useAiPanel } from "./ai-panel-provider";
import { startNewChat } from "@/features/ai/actions/start-new-chat";
import { getPanelPlaceholder } from "@/features/ai/components/ai-chat-helpers";
import { cn } from "@/lib/utils";
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
          <RequoIcon className="size-5 animate-pulse text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    ),
  },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AiSidePanelProps = {
  businessSlug: string;
  userId: string;
  businessId: string;
  userName: string;
};

// ---------------------------------------------------------------------------
// Panel new chat view (inline within the panel)
// ---------------------------------------------------------------------------

function PanelNewChatView({
  businessSlug,
  userId,
  businessId,
  onConversationCreated,
  contextLabel,
  onDismissContext,
}: {
  businessSlug: string;
  userId: string;
  businessId: string;
  onConversationCreated: (id: string, message: string) => void;
  contextLabel: string | null;
  onDismissContext: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isCreating) return;
    setIsCreating(true);

    const result = await startNewChat({
      userId,
      businessId,
      businessSlug,
      message: text,
    });

    if (result.conversationId) {
      onConversationCreated(result.conversationId, text);
    } else {
      setIsCreating(false);
    }
  }, [inputValue, isCreating, userId, businessId, businessSlug, onConversationCreated]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mb-4">
          <RequoIcon className="size-8 text-muted-foreground/40" />
        </div>
        <p className="mb-1 text-sm font-medium text-foreground">
          How can I help?
        </p>
        <p className="mb-6 text-center text-xs text-muted-foreground">
          Ask about inquiries, quotes, follow-ups, or business data.
        </p>
      </div>

      {/* Input at the bottom — same style as main chat */}
      <div className="shrink-0 px-3 pb-4">
        {contextLabel && (
          <div className="mb-2">
            <ContextChip label={contextLabel} onDismiss={onDismissContext} />
          </div>
        )}
        <PromptInput
          value={inputValue}
          onValueChange={setInputValue}
          onSubmit={handleSubmit}
          isLoading={isCreating}
          className="rounded-2xl border-border/80 bg-card shadow-md focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200"
        >
          <PromptInputTextarea
            placeholder={getPanelPlaceholder("dashboard")}
            className="text-sm"
          />
          <PromptInputActions className="justify-end pt-1">
            <PromptInputAction tooltip="Send message">
              <Button
                variant="default"
                size="icon-sm"
                className="rounded-full"
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isCreating}
                type="button"
              >
                <ArrowUp className="size-4" />
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detect if we're on an inquiry or quote detail page.
 * Used to inject entity context into the AI chat (same global conversation,
 * but the AI backend gets context about the current entity).
 */
function getPageContext(pathname: string): { surface: AiSurface; entityId: string; label: string | null } {
  const inquiryMatch = pathname.match(/\/inquiries\/([^/]+)/);
  if (inquiryMatch?.[1]) {
    const id = inquiryMatch[1];
    const shortId = id.length > 8 ? `${id.slice(0, 8)}…` : id;
    return { surface: "inquiry", entityId: id, label: `Inquiry "${shortId}"` };
  }

  const quoteMatch = pathname.match(/\/quotes\/([^/]+)/);
  if (quoteMatch?.[1]) {
    const id = quoteMatch[1];
    const shortId = id.length > 8 ? `${id.slice(0, 8)}…` : id;
    return { surface: "quote", entityId: id, label: `Quote "${shortId}"` };
  }

  return { surface: "dashboard", entityId: "global", label: null };
}

// ---------------------------------------------------------------------------
// Context chip shown above the input when on a detail page
// ---------------------------------------------------------------------------

function ContextChip({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm">
      <span className="size-2.5 shrink-0 rounded-full bg-primary" />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{label}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Remove context"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

export function AiSidePanel({
  businessSlug,
  userId,
  businessId,
  userName,
}: AiSidePanelProps) {
  const { isOpen, conversationId, setConversation, close } = useAiPanel();
  const pathname = usePathname();
  const isDesktop = useIsMdScreen();
  const [contextDismissed, setContextDismissed] = useState(false);

  // Detect page context for entity-aware AI (same global chat, extra context)
  const pageContext = getPageContext(pathname);

  // Reset dismissed state when navigating to a different entity
  const prevEntityRef = useRef(pageContext.entityId);
  useEffect(() => {
    if (prevEntityRef.current !== pageContext.entityId) {
      prevEntityRef.current = pageContext.entityId;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync dismissed state with route navigation
      setContextDismissed(false);
    }
  }, [pageContext.entityId]);

  // Determine effective surface/entityId (respect dismissal)
  const surface: AiSurface = contextDismissed ? "dashboard" : pageContext.surface;
  const entityId = contextDismissed ? "global" : pageContext.entityId;
  const contextLabel = contextDismissed ? null : pageContext.label;

  // Handle new chat creation in panel
  const handleConversationCreated = useCallback(
    (id: string, _message: string) => {
      setConversation(id);
    },
    [setConversation],
  );

  if (!isOpen) return null;

  // Shared panel content used by both desktop and mobile
  const panelContent = (
    <>
      <div className="flex-1 overflow-hidden">
        {conversationId ? (
          /* Active global conversation — with page context for entity awareness */
          <PendingMessageProvider>
            <ChatPageView
              key={`conv-${conversationId}`}
              businessSlug={businessSlug}
              conversationId={conversationId}
              userName={userName}
              surface={surface}
              entityId={entityId}
              hideHeader
            />
          </PendingMessageProvider>
        ) : (
          /* New chat view */
          <PanelNewChatView
            businessSlug={businessSlug}
            userId={userId}
            businessId={businessId}
            onConversationCreated={handleConversationCreated}
            contextLabel={contextLabel}
            onDismissContext={() => setContextDismissed(true)}
          />
        )}
      </div>

      {/* Context chip — floating above the input when on a detail page and conversation is active */}
      {contextLabel && conversationId && (
        <div className="shrink-0 px-3 pb-2">
          <ContextChip label={contextLabel} onDismiss={() => setContextDismissed(true)} />
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: sticky side panel */}
      <div
        className={cn(
          "ai-side-panel sticky top-[53px] hidden w-[380px] shrink-0 flex-col border-l border-border/60 bg-background md:flex",
          "h-[calc(100svh-53px)]",
          "animate-in slide-in-from-right-2 fade-in duration-200",
        )}
        data-ai-panel
      >
        {panelContent}
      </div>

      {/* Mobile: fullscreen sheet — only rendered below md breakpoint to avoid overlay on desktop */}
      {!isDesktop && (
        <Sheet open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-full max-w-full inset-0 flex flex-col p-0"
          >
            {/* Mobile sheet header */}
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <RequoIcon className="size-4 text-primary" />
                <SheetTitle className="text-sm font-medium">Requo AI</SheetTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setConversation(null)}
                  title="New chat"
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={close}
                  title="Close"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            {/* Sheet body */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {panelContent}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
