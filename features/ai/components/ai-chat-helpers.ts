"use client";

import type {
  AiChatStreamEvent,
  AiConversation,
  AiConversationSummary,
  AiMessage,
  AiMessageStatus,
  AiMessagesPage,
  AiSurface,
} from "@/features/ai/types";
import { aiAssistantTruncationMessage } from "@/features/ai/types";

export type ChatMessage = {
  id: string;
  role: AiMessage["role"];
  label: string;
  content: string;
  title?: string;
  model?: string;
  pending?: boolean;
  isError?: boolean;
  status?: AiMessageStatus;
  createdAt?: string;
  updatedAt?: string;
  statusNote?: {
    content: string;
    tone: "muted" | "error";
  };
};

export type ConversationMessagesSnapshot = {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type EntityConversationSnapshot = {
  conversation: AiConversation;
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const messagePageSize = 30;
export const topLoadThreshold = 96;

export function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function getMetadataBoolean(metadata: Record<string, unknown>, key: string) {
  return metadata[key] === true;
}

function getMessageModelLabel(message: AiMessage) {
  if (message.provider && message.model) {
    return `${message.provider}/${message.model}`;
  }

  return message.model ?? undefined;
}

export function mapAiMessageToChatMessage(
  message: AiMessage,
  userName: string,
): ChatMessage {
  const title = getMetadataString(message.metadata, "title") ?? undefined;
  const errorReason = getMetadataString(message.metadata, "errorReason");
  const truncated = getMetadataBoolean(message.metadata, "truncated");
  const failedWithoutContent =
    message.status === "failed" && !message.content.trim();

  return {
    id: message.id,
    role: message.role,
    label:
      message.role === "user"
        ? userName
        : message.role === "system"
          ? "System"
          : "Requo AI",
    content: failedWithoutContent
      ? errorReason ??
        "The assistant could not complete that request. Try again in a moment."
      : message.content,
    title: message.role === "assistant" ? title : undefined,
    model: message.role === "assistant" ? getMessageModelLabel(message) : undefined,
    pending: message.status === "generating",
    isError: failedWithoutContent,
    status: message.status,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    statusNote:
      message.status === "failed" && !failedWithoutContent && errorReason
        ? {
            content: errorReason,
            tone: "error",
          }
        : truncated
          ? {
              content: aiAssistantTruncationMessage,
              tone: "muted",
            }
          : undefined,
  };
}

export async function getJsonErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };

    if (payload.error) {
      return payload.error;
    }
  } catch {
    // Fall through to fallback.
  }

  return fallback;
}

export function getConversationEndpoint(input: {
  businessSlug: string;
  surface: AiSurface;
  entityId: string;
}) {
  const searchParams = new URLSearchParams({
    businessSlug: input.businessSlug,
    surface: input.surface,
    entityId: input.entityId,
  });

  return `/api/ai/conversation?${searchParams.toString()}`;
}

export function getDashboardConversationsEndpoint(input: {
  businessSlug: string;
  entityId: string;
}) {
  const searchParams = new URLSearchParams({
    businessSlug: input.businessSlug,
    surface: "dashboard",
    entityId: input.entityId,
    limit: "50",
  });

  return `/api/ai/conversations?${searchParams.toString()}`;
}

export function getMessagesEndpoint(input: {
  conversationId: string;
  before?: string | null;
}) {
  const searchParams = new URLSearchParams({
    limit: String(messagePageSize),
  });

  if (input.before) {
    searchParams.set("before", input.before);
  }

  return `/api/ai/conversations/${encodeURIComponent(
    input.conversationId,
  )}/messages?${searchParams.toString()}`;
}

export async function fetchConversation(input: {
  businessSlug: string;
  surface: AiSurface;
  entityId: string;
  signal?: AbortSignal;
}) {
  const response = await fetch(getConversationEndpoint(input), {
    headers: {
      accept: "application/json",
    },
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error(
      await getJsonErrorMessage(
        response,
        "The assistant conversation could not be loaded.",
      ),
    );
  }

  return (await response.json()) as { conversation: AiConversation };
}

export async function fetchMessagePage(input: {
  conversationId: string;
  before?: string | null;
  signal?: AbortSignal;
}) {
  const response = await fetch(getMessagesEndpoint(input), {
    headers: {
      accept: "application/json",
    },
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error(
      await getJsonErrorMessage(
        response,
        "Saved assistant messages could not be loaded.",
      ),
    );
  }

  return (await response.json()) as AiMessagesPage;
}

export async function fetchDashboardConversations(input: {
  businessSlug: string;
  entityId: string;
  signal?: AbortSignal;
}) {
  const response = await fetch(
    getDashboardConversationsEndpoint(input),
    {
      headers: { accept: "application/json" },
      signal: input.signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getJsonErrorMessage(
        response,
        "Dashboard conversation history could not be loaded.",
      ),
    );
  }

  return (await response.json()) as {
    conversations: AiConversationSummary[];
  };
}

export async function deleteConversation(conversationId: string) {
  const response = await fetch(`/api/ai/conversations/${conversationId}`, {
    method: "DELETE",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      await getJsonErrorMessage(response, "Could not delete this conversation."),
    );
  }

  return (await response.json()) as { deleted: boolean };
}

function parseStreamEvent(line: string) {
  const parsed = JSON.parse(line) as AiChatStreamEvent;

  if (
    parsed.type !== "conversation" &&
    parsed.type !== "messages" &&
    parsed.type !== "meta" &&
    parsed.type !== "status" &&
    parsed.type !== "delta" &&
    parsed.type !== "done" &&
    parsed.type !== "error"
  ) {
    throw new Error("Unexpected AI stream event.");
  }

  return parsed;
}

function parseServerSentEvent(lines: string[]) {
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  return dataLines.length ? parseStreamEvent(dataLines.join("\n")) : null;
}

export async function consumeStream(
  response: Response,
  onEvent: (event: AiChatStreamEvent) => void,
) {
  if (!response.body) {
    throw new Error("The assistant response stream was unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventLines: string[] = [];

  function flushEvent() {
    const event = parseServerSentEvent(eventLines);
    eventLines = [];

    if (event) {
      onEvent(event);
    }
  }

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let lineBreakIndex = buffer.indexOf("\n");

    while (lineBreakIndex >= 0) {
      const line = buffer.slice(0, lineBreakIndex).replace(/\r$/, "");
      buffer = buffer.slice(lineBreakIndex + 1);

      if (line === "") {
        if (eventLines.length) {
          flushEvent();
        }
      } else {
        eventLines.push(line);
      }

      lineBreakIndex = buffer.indexOf("\n");
    }
  }

  buffer += decoder.decode();

  const trailingLine = buffer.replace(/\r$/, "");

  if (trailingLine) {
    eventLines.push(trailingLine);
  }

  if (eventLines.length) {
    flushEvent();
  }
}

export function formatConversationTime(value: string | null) {
  if (!value) {
    return "No messages yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function createChatPreview(value: string, limit = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, limit - 3).trimEnd()}...`;
}

export function createDashboardChatTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "New dashboard chat";
  }

  const words = normalized.split(" ").slice(0, 8).join(" ");
  const title = words.length > 64 ? `${words.slice(0, 61).trimEnd()}...` : words;

  return title || "New dashboard chat";
}

function getConversationSortTime(conversation: AiConversationSummary) {
  const value = conversation.lastMessageAt ?? conversation.createdAt;
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function shouldSkipDashboardConversationHydration({
  currentConversationId,
  hasLocalMessages,
  isStreaming,
  nextConversationId,
}: {
  currentConversationId: string | null;
  hasLocalMessages: boolean;
  isStreaming: boolean;
  nextConversationId: string;
}) {
  return (
    currentConversationId === nextConversationId &&
    (hasLocalMessages || isStreaming)
  );
}

export function getEntityConversationCacheKey(
  surface: AiSurface,
  entityId: string,
) {
  return `${surface}:${entityId}`;
}

export function shouldWarmupEntityConversation(options: {
  surface: AiSurface;
  cacheHasSnapshot: boolean;
  hasAccess: boolean;
}) {
  return (
    options.hasAccess &&
    options.surface !== "dashboard" &&
    !options.cacheHasSnapshot
  );
}

export function shouldWarmupDashboardMessages(options: {
  surface: AiSurface;
  hasAccess: boolean;
  activeConversationId: string | null;
  cacheHasMessages: boolean;
}) {
  return (
    options.hasAccess &&
    options.surface === "dashboard" &&
    Boolean(options.activeConversationId) &&
    !options.cacheHasMessages
  );
}

export function createDashboardConversationSummary({
  conversation,
  messages,
}: {
  conversation: AiConversation;
  messages: ChatMessage[];
}): AiConversationSummary {
  const latestMessage = [...messages]
    .reverse()
    .find((message) => message.createdAt || message.updatedAt);
  const latestMessageWithContent = [...messages]
    .reverse()
    .find((message) => message.content.trim());
  const firstUserMessage = messages.find(
    (message) => message.role === "user" && message.content.trim(),
  );
  const shouldUseClientTitle =
    conversation.surface === "dashboard" &&
    firstUserMessage &&
    (!conversation.title || conversation.title === "New dashboard chat");

  return {
    ...conversation,
    title: shouldUseClientTitle
      ? createDashboardChatTitle(firstUserMessage.content)
      : conversation.title,
    lastMessageAt:
      latestMessage?.updatedAt ??
      latestMessage?.createdAt ??
      conversation.lastMessageAt,
    lastMessagePreview: latestMessageWithContent
      ? createChatPreview(latestMessageWithContent.content)
      : null,
  };
}

export function mergeDashboardConversationSummary(
  conversations: AiConversationSummary[],
  summary: AiConversationSummary,
) {
  return [
    summary,
    ...conversations.filter((conversation) => conversation.id !== summary.id),
  ]
    .sort(
      (a, b) =>
        getConversationSortTime(b) - getConversationSortTime(a) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 50);
}

export function getScrollTopAfterPrepend({
  previousScrollHeight,
  previousScrollTop,
  nextScrollHeight,
}: {
  previousScrollHeight: number;
  previousScrollTop: number;
  nextScrollHeight: number;
}) {
  return nextScrollHeight - previousScrollHeight + previousScrollTop;
}

export function isScrollNearBottom({
  scrollHeight,
  scrollTop,
  clientHeight,
  threshold = 96,
}: {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
  threshold?: number;
}) {
  return scrollTop + clientHeight >= scrollHeight - threshold;
}

export function mergeChronologicalMessages<T extends { id: string }>(
  olderMessages: T[],
  currentMessages: T[],
) {
  const currentIds = new Set(currentMessages.map((message) => message.id));

  return [
    ...olderMessages.filter((message) => !currentIds.has(message.id)),
    ...currentMessages,
  ];
}

export type QuickAction = {
  label: string;
  prompt: string;
};

export const aiQuickActions: Record<AiSurface, QuickAction[]> = {
  inquiry: [
    {
      label: "Draft first reply",
      prompt: "Draft the first reply for this inquiry.",
    },
    {
      label: "Summarize inquiry",
      prompt: "Summarize this inquiry and tell me what matters most.",
    },
    {
      label: "Suggest questions",
      prompt: "Suggest the follow-up questions I should ask for this inquiry.",
    },
    {
      label: "Suggest line items",
      prompt: "Suggest quote line items for this inquiry without pricing them.",
    },
  ],
  quote: [
    {
      label: "Draft quote wording",
      prompt:
        "Draft customer-ready quote wording for this quote without saving it.",
    },
    {
      label: "Improve wording",
      prompt: "Improve the quote wording and keep the meaning intact.",
    },
    {
      label: "Draft terms",
      prompt:
        "Draft concise quote terms, assumptions, and exclusions without changing saved fields.",
    },
    {
      label: "Missing info",
      prompt: "Identify missing quote information before this is sent.",
    },
  ],
  dashboard: [
    {
      label: "Open inquiries",
      prompt: "Summarize open inquiries and the next best actions.",
    },
    {
      label: "Quote follow-ups",
      prompt: "Which active quotes need follow-up?",
    },
    {
      label: "Urgent work",
      prompt: "Identify urgent or stale inquiries and quotes in this business.",
    },
    {
      label: "Weekly summary",
      prompt: "Draft a concise weekly operational summary for this business.",
    },
  ],
};

export function getPanelPlaceholder(surface: AiSurface) {
  switch (surface) {
    case "inquiry":
      return "Ask about this inquiry, or draft a follow-up...";
    case "quote":
      return "Ask for quote wording, terms, notes, or follow-up...";
    default:
      return "Ask about this business's inquiries, quotes, and follow-ups...";
  }
}
