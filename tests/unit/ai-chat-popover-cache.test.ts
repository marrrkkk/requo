import { describe, expect, it } from "vitest";

import {
  createDashboardConversationSummary,
  getEntityConversationCacheKey,
  mergeDashboardConversationSummary,
  type ChatMessage,
} from "@/features/ai/components/ai-chat-popover";
import type { AiConversation, AiConversationSummary } from "@/features/ai/types";

function makeConversation(
  overrides: Partial<AiConversation> = {},
): AiConversation {
  return {
    id: "aic_1",
    userId: "user_1",
    workspaceId: "workspace_1",
    surface: "dashboard",
    entityId: "global",
    title: "New dashboard chat",
    isDefault: false,
    lastMessageAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSummary(
  overrides: Partial<AiConversationSummary> = {},
): AiConversationSummary {
  return {
    ...makeConversation(overrides),
    lastMessagePreview: null,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "aim_1",
    role: "user",
    label: "You",
    content: "",
    status: "completed",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("AI chat popover cache helpers", () => {
  it("uses stable entity cache keys for detail conversations", () => {
    expect(getEntityConversationCacheKey("inquiry", "inq_123")).toBe(
      "inquiry:inq_123",
    );
  });

  it("builds dashboard summaries from the latest visible message", () => {
    const summary = createDashboardConversationSummary({
      conversation: makeConversation(),
      messages: [
        makeMessage({
          id: "aim_user",
          content: "Summarize open inquiries for this week.",
          role: "user",
        }),
        makeMessage({
          id: "aim_assistant",
          content: "Two inquiries need follow-up today.",
          role: "assistant",
          createdAt: "2026-05-01T00:00:05.000Z",
          updatedAt: "2026-05-01T00:00:08.000Z",
        }),
      ],
    });

    expect(summary.title).toBe("Summarize open inquiries for this week.");
    expect(summary.lastMessageAt).toBe("2026-05-01T00:00:08.000Z");
    expect(summary.lastMessagePreview).toBe(
      "Two inquiries need follow-up today.",
    );
  });

  it("keeps the active dashboard conversation at its latest sorted position", () => {
    const older = makeSummary({
      id: "aic_old",
      createdAt: "2026-05-01T00:00:00.000Z",
      lastMessageAt: "2026-05-01T00:01:00.000Z",
    });
    const active = makeSummary({
      id: "aic_active",
      createdAt: "2026-05-01T00:00:00.000Z",
      lastMessageAt: "2026-05-01T00:05:00.000Z",
      lastMessagePreview: "Latest answer",
    });

    const merged = mergeDashboardConversationSummary([older], active);

    expect(merged.map((conversation) => conversation.id)).toEqual([
      "aic_active",
      "aic_old",
    ]);
    expect(merged[0]?.lastMessagePreview).toBe("Latest answer");
  });
});
