"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LockedFeaturePage } from "@/components/shared/paywall";
import { hasFeatureAccess } from "@/lib/plans";
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
  const isDashboard = aiContext.surface === "dashboard";
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
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label={isOpen ? `Close ${title}` : `Open ${title}`}
            className="size-14 rounded-full border-border/70 bg-[var(--surface-elevated-bg)] p-0 shadow-[var(--surface-shadow-lg)]"
            data-testid={`${aiContext.surface}-ai-launcher`}
            onFocus={warmupOnOpenIntent}
            onMouseEnter={warmupOnOpenIntent}
            size="icon-lg"
            type="button"
            variant="outline"
          >
            <Image
              src="/logo.svg"
              alt=""
              width={34}
              height={34}
              className="size-[2.15rem] object-contain"
            />
            <span className="sr-only">
              {isOpen ? `Close ${title}` : `Open ${title}`}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="overlay-surface h-[calc(100vh-12rem)] w-[min(calc(100vw-1rem),27rem)] gap-0 overflow-hidden rounded-[1.5rem] border p-0 text-foreground"
          collisionPadding={8}
          data-testid={`${aiContext.surface}-ai-dialog`}
          onOpenAutoFocus={(event) => event.preventDefault()}
          side="top"
          sideOffset={18}
        >
          {hasAccess ? (
            <AIChatPanel
              activeDashboardConversation={
                isDashboard ? activeDashboardConversation : null
              }
              businessSlug={businessSlug}
              cachedDashboardConversations={
                isDashboard ? cachedConversations : null
              }
              entityCache={entityCache}
              entityId={aiContext.entityId}
              // Remount the panel when the surface/entity changes so it picks
              // up the correct dedicated chat for that inquiry/quote.
              key={`${aiContext.surface}:${aiContext.entityId}`}
              messagesCache={messagesCache}
              onActiveDashboardConversationChange={
                setActiveDashboardConversation
              }
              onClose={() => setIsOpen(false)}
              onDashboardConversationsChange={setCachedConversations}
              onEntityCacheUpdate={handleEntityCacheUpdate}
              onMessagesCacheUpdate={handleMessagesCacheUpdate}
              surface={aiContext.surface}
              title={title}
              userName={userName}
            />
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-[var(--surface-sunken-bg)] px-4 py-3">
                <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  {title}
                </h3>
                <Button
                  aria-label="Close panel"
                  className="size-7 rounded-[0.4rem] [&_svg]:size-3.5"
                  onClick={() => setIsOpen(false)}
                  size="icon"
                  variant="ghost"
                >
                  <X />
                </Button>
              </div>
              <div className="flex flex-1 flex-col justify-center p-4">
                <LockedFeaturePage
                  className="border-none shadow-none px-4 py-8"
                  feature="aiAssistant"
                  plan={plan}
                />
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
