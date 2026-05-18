"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan } from "@/lib/plans/plans";
import type {
  AiConversation,
  AiConversationSummary,
} from "@/features/ai/types";

import { AIChatPanel } from "@/features/ai/components/ai-chat-panel";
import {
  fetchDashboardConversations,
  getJsonErrorMessage,
  mergeDashboardConversationSummary,
  type ConversationMessagesSnapshot,
  type EntityConversationSnapshot,
} from "@/features/ai/components/ai-chat-helpers";

type AssistantFullPageProps = {
  businessSlug: string;
  userName: string;
  plan: BusinessPlan;
};

/**
 * Full-page dashboard AI assistant.
 *
 * Always starts a fresh chat on page load (refresh). React state is preserved
 * during client-side navigation so navigating away and back keeps the current
 * conversation alive within the same browser session.
 */
export function AssistantFullPage({
  businessSlug,
  userName,
  plan,
}: AssistantFullPageProps) {
  const hasAccess = hasFeatureAccess(plan, "aiAssistant");
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

  const initRef = useRef(false);

  // Always create a fresh conversation on mount
  useEffect(() => {
    if (!hasAccess || initRef.current) return;
    initRef.current = true;

    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            businessSlug,
            surface: "dashboard",
            entityId: "global",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            await getJsonErrorMessage(response, "Could not create a new chat."),
          );
        }

        const payload = (await response.json()) as { conversation: AiConversation };
        setActiveDashboardConversation(payload.conversation);
        messagesCache.set(payload.conversation.id, {
          messages: [],
          nextCursor: null,
          hasMore: false,
        });
      } catch {
        // Will show empty state; user can retry via New Chat button
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSlug, hasAccess]);

  // Fetch conversation list in the background (for history panel)
  useEffect(() => {
    if (!hasAccess) return;

    const controller = new AbortController();

    fetchDashboardConversations({
      businessSlug,
      entityId: "global",
      signal: controller.signal,
    })
      .then((payload) => {
        setCachedConversations((current) => {
          if (!current?.length) return payload.conversations;
          return current.reduce(
            (merged, conversation) =>
              mergeDashboardConversationSummary(merged, conversation),
            payload.conversations,
          );
        });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [businessSlug, hasAccess]);

  const handleActiveDashboardConversationChange = useCallback(
    (conversation: AiConversation | null) => {
      setActiveDashboardConversation(conversation);
    },
    [],
  );

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
    <motion.div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <AIChatPanel
        activeDashboardConversation={activeDashboardConversation}
        businessSlug={businessSlug}
        cachedDashboardConversations={cachedConversations}
        entityCache={entityCache}
        entityId="global"
        hideClose
        messagesCache={messagesCache}
        onActiveDashboardConversationChange={handleActiveDashboardConversationChange}
        onClose={() => {}}
        onDashboardConversationsChange={setCachedConversations}
        onEntityCacheUpdate={handleEntityCacheUpdate}
        onMessagesCacheUpdate={handleMessagesCacheUpdate}
        plan={plan}
        surface="dashboard"
        title="Ask"
        userName={userName}
        variant="fullPage"
      />
    </motion.div>
  );
}
