"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan } from "@/lib/plans/plans";
import { cn } from "@/lib/utils";
import type {
  AiConversation,
  AiConversationSummary,
  AiSurface,
} from "@/features/ai/types";

import { AIChatPanel } from "@/features/ai/components/ai-chat-panel";
import {
  fetchConversation,
  fetchDashboardConversations,
  fetchMessagePage,
  getEntityConversationCacheKey,
  mapAiMessageToChatMessage,
  mergeDashboardConversationSummary,
  shouldWarmupDashboardMessages,
  shouldWarmupEntityConversation,
  type ConversationMessagesSnapshot,
  type EntityConversationSnapshot,
} from "@/features/ai/components/ai-chat-helpers";

export type {
  ChatMessage,
  ConversationMessagesSnapshot,
  EntityConversationSnapshot,
} from "@/features/ai/components/ai-chat-helpers";

export {
  createDashboardConversationSummary,
  getEntityConversationCacheKey,
  mergeDashboardConversationSummary,
  shouldSkipDashboardConversationHydration,
  shouldWarmupDashboardMessages,
  shouldWarmupEntityConversation,
} from "@/features/ai/components/ai-chat-helpers";

export {
  AIChatPanel,
  ChatInput,
  ChatMessageList,
  DashboardChatHistoryList,
} from "@/features/ai/components/ai-chat-panel";

/**
 * Matches entity detail routes like:
 *   /businesses/<slug>/inquiries/inq_abc123
 *   /businesses/<slug>/quotes/quo_abc123
 *
 * Does NOT match list pages or `/new` routes.
 */
const entityDetailPattern =
  /\/businesses\/[^/]+\/(inquiries|quotes)\/(?!new(?:\/|$))([^/?#]+)\/?$/;

type AiContext = {
  surface: AiSurface;
  entityId: string;
};

function resolveAiContext(pathname: string): AiContext {
  const match = entityDetailPattern.exec(pathname);

  if (!match) {
    return {
      surface: "dashboard",
      entityId: "global",
    };
  }

  const [, entityType, entityId] = match;

  return {
    surface: entityType === "inquiries" ? "inquiry" : "quote",
    entityId: entityId!,
  };
}

function resolvePanelTitle(surface: AiSurface) {
  switch (surface) {
    case "inquiry":
      return "Inquiry Assistant";
    case "quote":
      return "Quote Assistant";
    default:
      return "Requo AI";
  }
}

type AIChatPopoverProps = {
  businessSlug: string;
  userName: string;
  plan: BusinessPlan;
};

export function AIChatPopover({
  businessSlug,
  userName,
  plan,
}: AIChatPopoverProps) {
  const pathname = usePathname();
  const aiContext = useMemo(() => resolveAiContext(pathname), [pathname]);
  const hasAccess = hasFeatureAccess(plan, "aiAssistant");
  const [isOpen, setIsOpen] = useState(false);
  // Track whether the panel has ever been opened. We only show the close
  // animation after the first open — otherwise the animate-out keyframes
  // briefly flash the panel visible on re-renders that happen before the
  // user has ever opened it.
  const hasBeenOpenedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      hasBeenOpenedRef.current = true;
    }
  }, [isOpen]);
  const [cachedConversations, setCachedConversations] = useState<
    AiConversationSummary[] | null
  >(null);
  const [activeDashboardConversation, setActiveDashboardConversation] =
    useState<AiConversation | null>(null);
  const [messagesCache] = useState(
    () => new Map<string, ConversationMessagesSnapshot>(),
  );
  const [entityCache] = useState(
    () => new Map<string, EntityConversationSnapshot>(),
  );

  const title = resolvePanelTitle(aiContext.surface);
  const dashboardListWarmupStartedRef = useRef(false);
  const entityWarmupInFlightRef = useRef(new Map<string, Promise<void>>());
  const messagesWarmupInFlightRef = useRef(new Map<string, Promise<void>>());
  const entityCacheKey = getEntityConversationCacheKey(
    aiContext.surface,
    aiContext.entityId,
  );

  // Pre-fetch dashboard conversation list once per mount. The cache is
  // reused across popover open/close cycles so reopening stays instant.
  useEffect(() => {
    if (!hasAccess || dashboardListWarmupStartedRef.current) {
      return;
    }
    dashboardListWarmupStartedRef.current = true;

    const controller = new AbortController();

    fetchDashboardConversations({
      businessSlug,
      entityId: "global",
      signal: controller.signal,
    })
      .then((payload) => {
        setCachedConversations((currentConversations) => {
          if (!currentConversations?.length) {
            return payload.conversations;
          }

          return currentConversations.reduce(
            (mergedConversations, conversation) =>
              mergeDashboardConversationSummary(
                mergedConversations,
                conversation,
              ),
            payload.conversations,
          );
        });
      })
      .catch(() => {
        // Panel will fetch again if the cache is empty when opened.
      });

    return () => controller.abort();
  }, [businessSlug, hasAccess]);

  const warmupEntityConversation = useCallback(() => {
    if (
      !shouldWarmupEntityConversation({
        surface: aiContext.surface,
        cacheHasSnapshot: entityCache.has(entityCacheKey),
        hasAccess,
      })
    ) {
      return;
    }

    if (entityWarmupInFlightRef.current.has(entityCacheKey)) {
      return;
    }

    const request = (async () => {
      try {
        const { conversation } = await fetchConversation({
          businessSlug,
          surface: aiContext.surface,
          entityId: aiContext.entityId,
        });
        const page = await fetchMessagePage({
          conversationId: conversation.id,
        });
        const messages = page.messages.map((message) =>
          mapAiMessageToChatMessage(message, userName),
        );

        entityCache.set(entityCacheKey, {
          conversation,
          messages,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
        messagesCache.set(conversation.id, {
          messages,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
      } catch {
        // Panel will reload on open if the cache is still empty.
      } finally {
        entityWarmupInFlightRef.current.delete(entityCacheKey);
      }
    })();

    entityWarmupInFlightRef.current.set(entityCacheKey, request);
  }, [
    aiContext.entityId,
    aiContext.surface,
    businessSlug,
    entityCache,
    entityCacheKey,
    hasAccess,
    messagesCache,
    userName,
  ]);

  const warmupDashboardActiveConversation = useCallback(() => {
    const activeConversationId = activeDashboardConversation?.id ?? null;

    if (
      !shouldWarmupDashboardMessages({
        surface: aiContext.surface,
        hasAccess,
        activeConversationId,
        cacheHasMessages: activeConversationId
          ? messagesCache.has(activeConversationId)
          : false,
      }) ||
      !activeConversationId
    ) {
      return;
    }

    if (messagesWarmupInFlightRef.current.has(activeConversationId)) {
      return;
    }

    const request = (async () => {
      try {
        const page = await fetchMessagePage({
          conversationId: activeConversationId,
        });
        const messages = page.messages.map((message) =>
          mapAiMessageToChatMessage(message, userName),
        );

        messagesCache.set(activeConversationId, {
          messages,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
      } catch {
        // Panel will reload on open if the cache is still empty.
      } finally {
        messagesWarmupInFlightRef.current.delete(activeConversationId);
      }
    })();

    messagesWarmupInFlightRef.current.set(activeConversationId, request);
  }, [
    activeDashboardConversation,
    aiContext.surface,
    hasAccess,
    messagesCache,
    userName,
  ]);

  const warmupOnOpenIntent = useCallback(() => {
    if (!hasAccess) return;

    warmupEntityConversation();
    warmupDashboardActiveConversation();
  }, [hasAccess, warmupDashboardActiveConversation, warmupEntityConversation]);

  useEffect(() => {
    if (isOpen) {
      warmupOnOpenIntent();
    }
  }, [isOpen, warmupOnOpenIntent]);

  // Auto-close when navigating to an entity detail page (inquiry/quote).
  // The entity-specific AI is handled inline on those pages.
  const prevSurfaceRef = useRef(aiContext.surface);

  useEffect(() => {
    if (
      aiContext.surface !== "dashboard" &&
      prevSurfaceRef.current === "dashboard"
    ) {
      setIsOpen(false);
    }

    prevSurfaceRef.current = aiContext.surface;
  }, [aiContext.surface]);

  const handleMessagesCacheUpdate = useCallback(
    (conversationId: string, snapshot: ConversationMessagesSnapshot) => {
      messagesCache.set(conversationId, snapshot);
    },
    [messagesCache],
  );

  const handleEntityCacheUpdate = useCallback(
    (key: string, snapshot: EntityConversationSnapshot) => {
      entityCache.set(key, snapshot);
    },
    [entityCache],
  );

  // Hide the trigger entirely on entity detail pages (inquiry/quote have
  // their own inline AI panel).
  if (aiContext.surface !== "dashboard") {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5"
      suppressHydrationWarning
    >
      {/* Panel — always mounted so scroll position and input are preserved */}
      <div
        aria-hidden={!isOpen}
        className={cn(
          "absolute bottom-[calc(100%+1.125rem)] right-0 flex h-[calc(100vh-12rem)] w-[min(calc(100vw-1rem),27rem)] flex-col overflow-hidden rounded-[1.5rem] border bg-popover text-foreground shadow-md ring-1 ring-foreground/10 overlay-surface origin-bottom-right",
          isOpen
            ? "animate-in fade-in-0 zoom-in-90 slide-in-from-bottom-4 duration-250"
            : hasBeenOpenedRef.current
              ? "animate-out fade-out-0 zoom-out-90 slide-out-to-bottom-4 duration-200 pointer-events-none fill-mode-forwards"
              : "pointer-events-none invisible opacity-0",
        )}
        data-testid={`${aiContext.surface}-ai-dialog`}
        role="dialog"
      >
        <AIChatPanel
          activeDashboardConversation={activeDashboardConversation}
          businessSlug={businessSlug}
          cachedDashboardConversations={cachedConversations}
          entityCache={entityCache}
          entityId={aiContext.entityId}
          messagesCache={messagesCache}
          onActiveDashboardConversationChange={
            setActiveDashboardConversation
          }
          onClose={() => setIsOpen(false)}
          onDashboardConversationsChange={setCachedConversations}
          onEntityCacheUpdate={handleEntityCacheUpdate}
          onMessagesCacheUpdate={handleMessagesCacheUpdate}
          plan={plan}
          surface={aiContext.surface}
          title={title}
          userName={userName}
        />
      </div>

      {/* Trigger button */}
      <Button
        aria-label={isOpen ? `Close ${title}` : `Open ${title}`}
        className="size-14 rounded-full border-border/70 bg-[var(--surface-elevated-bg)] p-0 shadow-[var(--surface-shadow-lg)]"
        data-testid={`${aiContext.surface}-ai-launcher`}
        onClick={() => setIsOpen((open) => !open)}
        onFocus={warmupOnOpenIntent}
        onMouseEnter={warmupOnOpenIntent}
        size="icon-lg"
        type="button"
        variant="outline"
      >
        {isOpen ? (
          <ChevronDown className="size-6 text-muted-foreground" />
        ) : (
          <Image
            src="/logo.svg"
            alt=""
            width={34}
            height={34}
            className="size-[2.15rem] object-contain"
          />
        )}
        <span className="sr-only">
          {isOpen ? `Close ${title}` : `Open ${title}`}
        </span>
      </Button>
    </div>
  );
}
