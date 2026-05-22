"use client";

import { useCallback, useEffect, useState } from "react";
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

  // No eager conversation creation — the panel creates one lazily on first send.

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
