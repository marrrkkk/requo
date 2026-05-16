"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { hasFeatureAccess } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { BusinessPlan } from "@/lib/plans/plans";
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
  void surface;
  return "Requo AI";
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

  // Close the popover when navigating between surfaces so the user
  // starts fresh on the new context.
  const prevSurfaceRef = useRef(aiContext.surface);

  useEffect(() => {
    if (aiContext.surface !== prevSurfaceRef.current) {
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

  return (
    <div
      className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5"
      suppressHydrationWarning
    >
      {/* Panel */}
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-popover text-foreground sm:absolute sm:inset-auto sm:bottom-[calc(100%+1.125rem)] sm:right-0 sm:z-auto sm:h-[calc(100vh-12rem)] sm:w-[min(calc(100vw-1rem),27rem)] sm:rounded-[1.5rem] sm:border sm:shadow-md sm:ring-1 sm:ring-foreground/10 sm:overlay-surface sm:origin-bottom-right"
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
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Trigger button — hidden on mobile when panel is full-screen open */}
      <Button
        aria-label={isOpen ? `Close ${title}` : `Open ${title}`}
        className={cn(
          "size-14 rounded-full border-border/70 bg-[var(--surface-elevated-bg)] p-0 shadow-[var(--surface-shadow-lg)] overflow-hidden",
          isOpen && "max-sm:hidden",
        )}
        data-testid={`${aiContext.surface}-ai-launcher`}
        onClick={() => setIsOpen((open) => !open)}
        onFocus={warmupOnOpenIntent}
        onMouseEnter={warmupOnOpenIntent}
        size="icon-lg"
        type="button"
        variant="outline"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: 90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex items-center justify-center"
            >
              <ChevronDown className="size-6 text-muted-foreground" />
            </motion.span>
          ) : (
            <motion.span
              key="logo"
              initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex items-center justify-center"
            >
              <Image
                src="/logo.svg"
                alt=""
                width={34}
                height={34}
                className="size-[2.15rem] object-contain"
              />
            </motion.span>
          )}
        </AnimatePresence>
        <span className="sr-only">
          {isOpen ? `Close ${title}` : `Open ${title}`}
        </span>
      </Button>
    </div>
  );
}
