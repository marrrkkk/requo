"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowDown,
  Check,
  Copy,
  History,
  MessageSquarePlus,
  SendHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type {
  AiChatStreamEvent,
  AiConversation,
  AiConversationSummary,
  AiMessage,
  AiMessagesPage,
  AiSurface,
} from "@/features/ai/types";
import { aiAssistantTruncationMessage } from "@/features/ai/types";
import {
  getScrollTopAfterPrepend,
  isScrollNearBottom,
  mergeChronologicalMessages,
} from "@/features/ai/components/inquiry-ai-panel-utils";
import { cn } from "@/lib/utils";
import { LockedFeaturePage } from "@/components/shared/paywall";
import { hasFeatureAccess, type WorkspacePlan } from "@/lib/plans";

const messagePageSize = 30;
const topLoadThreshold = 96;

type AIChatPopoverProps = {
  businessSlug: string;
  entityId: string;
  surface: AiSurface;
  userName: string;
  title?: string;
  workspacePlan: WorkspacePlan;
};

type ConversationMessagesSnapshot = {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

type EntityConversationSnapshot = {
  conversation: AiConversation;
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

type CopyState = "idle" | "copied" | "error";

export type ChatMessage = {
  id: string;
  role: AiMessage["role"];
  label: string;
  content: string;
  title?: string;
  model?: string;
  pending?: boolean;
  isError?: boolean;
  status?: AiMessage["status"];
  createdAt?: string;
  updatedAt?: string;
  statusNote?: {
    content: string;
    tone: "muted" | "error";
  };
};

type MessageCopyState = {
  messageId: string;
  state: CopyState;
} | null;

type AssistantTerminalEvent = Extract<
  AiChatStreamEvent,
  { type: "done" | "error" }
>;

type QuickAction = {
  label: string;
  prompt: string;
};

const quickActions: Record<AiSurface, QuickAction[]> = {
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
      prompt: "Draft customer-ready quote wording for this quote without saving it.",
    },
    {
      label: "Improve wording",
      prompt: "Improve the quote wording and keep the meaning intact.",
    },
    {
      label: "Draft terms",
      prompt: "Draft concise quote terms, assumptions, and exclusions without changing saved fields.",
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


function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function useTimedCopyState() {
  const [state, setState] = useState<MessageCopyState>(null);

  useEffect(() => {
    if (!state) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setState(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [state]);

  return [state, setState] as const;
}

async function copyText(
  value: string,
  messageId: string,
  setState: (state: MessageCopyState) => void,
) {
  try {
    await navigator.clipboard.writeText(value);
    setState({ messageId, state: "copied" });
  } catch {
    setState({ messageId, state: "error" });
  }
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

function mapAiMessageToChatMessage(
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

async function getJsonErrorMessage(response: Response, fallback: string) {
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

function getConversationEndpoint(input: {
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

function getDashboardConversationsEndpoint(input: {
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

function getMessagesEndpoint(input: {
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

async function fetchConversation(input: {
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
      await getJsonErrorMessage(response, "The assistant conversation could not be loaded."),
    );
  }

  return (await response.json()) as { conversation: AiConversation };
}

async function fetchMessagePage(input: {
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

function parseStreamEvent(line: string) {
  const parsed = JSON.parse(line) as AiChatStreamEvent;

  if (
    parsed.type !== "conversation" &&
    parsed.type !== "messages" &&
    parsed.type !== "meta" &&
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

async function consumeStream(
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

function formatConversationTime(value: string | null) {
  if (!value) {
    return "No messages yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function createChatPreview(value: string, limit = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, limit - 3).trimEnd()}...`;
}

function createDashboardChatTitle(message: string) {
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

function TranscriptMessage({
  message,
  copyState,
  onCopy,
}: {
  message: ChatMessage;
  copyState: MessageCopyState;
  onCopy: (message: ChatMessage) => void;
}) {
  const isUser = message.role === "user";
  const copyFeedback =
    copyState && copyState.messageId === message.id ? copyState.state : "idle";
  const showPendingOnly = message.pending && !message.content.trim();

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[92%] flex-col gap-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        <span className="meta-label px-1">
          {isUser
            ? message.label
            : message.isError
              ? "Requo AI error"
              : message.label}
        </span>

        <div
          className={cn(
            "w-full rounded-2xl px-4 py-4",
            isUser
              ? "bg-primary text-primary-foreground shadow-[var(--control-shadow)]"
              : "section-panel shadow-none",
            message.isError && !isUser && "border-destructive/30",
          )}
        >
          {showPendingOnly ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner aria-hidden="true" data-icon="inline-start" />
              Thinking through the request...
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {!isUser && (message.title || message.model) ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  {message.title ? (
                    <h3 className="font-heading text-base font-semibold text-foreground">
                      {message.title}
                    </h3>
                  ) : null}

                  {message.model ? (
                    <span className="rounded-md border border-border/80 bg-secondary px-3 py-1 text-xs text-muted-foreground">
                      {message.model}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {isUser ? (
                <p className="whitespace-pre-wrap text-sm leading-normal sm:leading-7 text-primary-foreground">
                  {message.content}
                </p>
              ) : (
                <div
                  className={cn(
                    "ai-prose text-sm leading-normal sm:leading-7",
                    message.isError ? "text-destructive" : "text-foreground",
                  )}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {message.pending && !isUser ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner aria-hidden="true" data-icon="inline-start" />
                  Streaming response...
                </div>
              ) : null}

              {message.statusNote ? (
                <p
                  className={cn(
                    "text-xs leading-5",
                    message.statusNote.tone === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {message.statusNote.content}
                </p>
              ) : null}

              {!isUser && message.content.trim() ? (
                <div className="flex justify-end">
                  <Button
                    onClick={() => onCopy(message)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {copyFeedback === "copied" ? (
                      <Check data-icon="inline-start" />
                    ) : (
                      <Copy data-icon="inline-start" />
                    )}
                    {copyFeedback === "copied"
                      ? "Copied"
                      : copyFeedback === "error"
                        ? "Copy failed"
                        : "Copy"}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  copyState,
  hasMore,
  hydrateError,
  isHydrating,
  isLoadingOlder,
  paginationError,
  loadingLabel,
  onCopy,
  onReload,
}: {
  messages: ChatMessage[];
  copyState: MessageCopyState;
  hasMore: boolean;
  hydrateError: string | null;
  isHydrating: boolean;
  isLoadingOlder: boolean;
  paginationError: string | null;
  loadingLabel?: string;
  onCopy: (message: ChatMessage) => void;
  onReload: () => void;
}) {
  if (messages.length) {
    return (
      <>
        <div className="flex min-h-7 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          {isLoadingOlder ? (
            <span className="flex items-center gap-2">
              <Spinner aria-hidden="true" data-icon="inline-start" />
              Loading older messages...
            </span>
          ) : !hasMore && !isHydrating ? (
            <span>Start of conversation</span>
          ) : (
            <span className="sr-only">Scroll up to load older messages</span>
          )}
          {paginationError ? (
            <span className="text-destructive">{paginationError}</span>
          ) : null}
        </div>

        {messages.map((message) => (
          <TranscriptMessage
            copyState={copyState}
            key={message.id}
            message={message}
            onCopy={onCopy}
          />
        ))}
      </>
    );
  }

  if (isHydrating) {
    return (
      <div className="flex min-h-[17rem] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" />
        {loadingLabel ?? "Loading saved assistant history..."}
      </div>
    );
  }

  if (hydrateError) {
    return (
      <div className="flex min-h-[17rem] flex-col items-center justify-center gap-3 text-center">
        <p className="max-w-xs text-sm leading-6 text-muted-foreground">
          {hydrateError}
        </p>
        <Button onClick={onReload} size="sm" type="button" variant="outline">
          Try again
        </Button>
      </div>
    );
  }

  return null;
}

export function ChatInput({
  disabled,
  placeholder,
  value,
  onChange,
  onSubmit,
}: {
  disabled: boolean;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form className="relative" onSubmit={handleSubmit}>
      <Textarea
        className="min-h-[2.75rem] max-h-[6rem] resize-none py-2.5 pr-12 shadow-[var(--control-shadow)]"
        disabled={disabled}
        maxLength={6000}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        value={value}
      />

      <div className="absolute bottom-1 right-1">
        <Button
          className="size-9 rounded-[0.45rem]"
          disabled={disabled || !value.trim()}
          size="icon"
          type="submit"
        >
          {disabled ? <Spinner aria-hidden="true" /> : <SendHorizontal />}
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </form>
  );
}
export function DashboardChatHistoryList({
  conversations,
  isLoading,
  onSelect,
}: {
  conversations: AiConversationSummary[];
  isLoading: boolean;
  onSelect: (conversation: AiConversationSummary) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="flex min-h-[16rem] items-center justify-center text-sm text-muted-foreground">
            <Spinner aria-hidden="true" />
          </div>
        ) : conversations.length ? (
          <div className="flex flex-col gap-2">
            {conversations.map((conversation) => (
              <button
                className="rounded-xl border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:bg-accent"
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                type="button"
              >
                <span className="block truncate text-sm font-medium text-foreground">
                  {conversation.title ?? "New dashboard chat"}
                </span>
                <span className="mt-1 block truncate text-sm text-muted-foreground">
                  {conversation.lastMessagePreview ?? "No messages yet"}
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {formatConversationTime(conversation.lastMessageAt)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[16rem] items-center justify-center text-center text-sm leading-6 text-muted-foreground">
            No dashboard conversations yet.
          </div>
        )}
      </div>
    </div>
  );
}

export function AIChatPanel({
  activeDashboardConversation,
  businessSlug,
  cachedDashboardConversations,
  entityCache,
  entityId,
  messagesCache,
  surface,
  title,
  userName,
  onClose,
  onActiveDashboardConversationChange,
  onDashboardConversationsChange,
  onEntityCacheUpdate,
  onMessagesCacheUpdate,
}: AIChatPopoverProps & {
  activeDashboardConversation?: AiConversation | null;
  cachedDashboardConversations?: AiConversationSummary[] | null;
  entityCache?: Map<string, EntityConversationSnapshot>;
  messagesCache?: Map<string, ConversationMessagesSnapshot>;
  onClose: () => void;
  onActiveDashboardConversationChange?: (conversation: AiConversation) => void;
  onDashboardConversationsChange?: (conversations: AiConversationSummary[]) => void;
  onEntityCacheUpdate?: (key: string, snapshot: EntityConversationSnapshot) => void;
  onMessagesCacheUpdate?: (conversationId: string, snapshot: ConversationMessagesSnapshot) => void;
}) {
  const isDashboard = surface === "dashboard";
  const hasCachedList = isDashboard && cachedDashboardConversations != null;
  const entityCacheKey = getEntityConversationCacheKey(surface, entityId);
  const initialEntitySnapshot = !isDashboard
    ? entityCache?.get(entityCacheKey)
    : undefined;
  const initialDashboardMessages =
    isDashboard && activeDashboardConversation
      ? messagesCache?.get(activeDashboardConversation.id)
      : undefined;
  const [conversation, setConversation] = useState<AiConversation | null>(() =>
    isDashboard
      ? (activeDashboardConversation ?? null)
      : (initialEntitySnapshot?.conversation ?? null),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialDashboardMessages?.messages ?? initialEntitySnapshot?.messages ?? [],
  );
  const [composerValue, setComposerValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isHydrating, setIsHydrating] = useState(() =>
    isDashboard
      ? Boolean(activeDashboardConversation && !initialDashboardMessages)
      : !initialEntitySnapshot,
  );
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(
    () => initialDashboardMessages?.hasMore ?? initialEntitySnapshot?.hasMore ?? false,
  );
  const [nextCursor, setNextCursor] = useState<string | null>(
    () => initialDashboardMessages?.nextCursor ?? initialEntitySnapshot?.nextCursor ?? null,
  );
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(
    () => isDashboard && !activeDashboardConversation,
  );
  const [historyConversations, setHistoryConversations] = useState<
    AiConversationSummary[]
  >(cachedDashboardConversations ?? []);
  const [isHistoryLoading, setIsHistoryLoading] = useState(isDashboard && !hasCachedList);
  const [copyState, setCopyState] = useTimedCopyState();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const loadingDashboardConversationIdRef = useRef<string | null>(null);
  const streamingConversationIdRef = useRef<string | null>(null);
  const prependSnapshotRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const activeConversationIdRef = useRef(conversation?.id ?? null);
  const hasLocalMessagesRef = useRef(messages.length > 0);

  activeConversationIdRef.current = conversation?.id ?? null;
  hasLocalMessagesRef.current = messages.length > 0;

  function syncDashboardConversations(conversations: AiConversationSummary[]) {
    setHistoryConversations(conversations);
    onDashboardConversationsChange?.(conversations);
  }

  function upsertDashboardConversationSummary(summary: AiConversationSummary) {
    syncDashboardConversations(
      mergeDashboardConversationSummary(historyConversations, summary),
    );
  }

  // Details routes should always show their dedicated entity conversation.
  useEffect(() => {
    setHistoryOpen(isDashboard && !activeDashboardConversation);
  }, [isDashboard, activeDashboardConversation]);

  useEffect(() => {
    if (!isDashboard || cachedDashboardConversations == null) {
      return;
    }

    setHistoryConversations(cachedDashboardConversations);
    setIsHistoryLoading(false);
  }, [isDashboard, cachedDashboardConversations]);

  useEffect(() => {
    if (!isDashboard || !activeDashboardConversation) {
      return;
    }

    setConversation(activeDashboardConversation);
    setHistoryOpen(false);
    setHydrateError(null);
    setPaginationError(null);

    if (
      shouldSkipDashboardConversationHydration({
        currentConversationId: activeConversationIdRef.current,
        hasLocalMessages: hasLocalMessagesRef.current,
        isStreaming:
          streamingConversationIdRef.current === activeDashboardConversation.id,
        nextConversationId: activeDashboardConversation.id,
      })
    ) {
      return;
    }

    if (
      loadingDashboardConversationIdRef.current === activeDashboardConversation.id
    ) {
      return;
    }

    const cached = messagesCache?.get(activeDashboardConversation.id);

    if (cached && reloadKey === 0) {
      setMessages(cached.messages);
      setNextCursor(cached.nextCursor);
      setHasMore(cached.hasMore);
      setIsHydrating(false);
      shouldScrollToBottomRef.current = true;
      return;
    }

    const controller = new AbortController();

    setIsHydrating(true);
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);

    fetchMessagePage({
      conversationId: activeDashboardConversation.id,
      signal: controller.signal,
    })
      .then((page) => {
        const loadedMessages = page.messages.map((message) =>
          mapAiMessageToChatMessage(message, userName),
        );

        setMessages(loadedMessages);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        shouldScrollToBottomRef.current = true;

        onMessagesCacheUpdate?.(activeDashboardConversation.id, {
          messages: loadedMessages,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setHydrateError(
          error instanceof Error
            ? error.message
            : "Saved assistant messages could not be loaded.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsHydrating(false);
        }
      });

    return () => controller.abort();
  }, [
    isDashboard,
    activeDashboardConversation,
    messagesCache,
    onMessagesCacheUpdate,
    reloadKey,
    userName,
  ]);

  // Dashboard: fetch conversation list on mount only if not already cached
  useEffect(() => {
    if (!isDashboard || hasCachedList) {
      return;
    }

    const controller = new AbortController();

    if (!activeDashboardConversation) {
      setHistoryOpen(true);
    }
    setIsHistoryLoading(true);

    fetch(getDashboardConversationsEndpoint({ businessSlug, entityId }), {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await getJsonErrorMessage(
              response,
              "Dashboard conversation history could not be loaded.",
            ),
          );
        }

        const payload = (await response.json()) as {
          conversations: AiConversationSummary[];
        };

        setHistoryConversations(payload.conversations);
        onDashboardConversationsChange?.(payload.conversations);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to load dashboard AI history.", error);
        setHistoryConversations([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsHistoryLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    isDashboard,
    activeDashboardConversation,
    hasCachedList,
    businessSlug,
    entityId,
    reloadKey,
    onDashboardConversationsChange,
  ]);

  // Inquiry/Quote: restore from cache or fetch conversation + messages
  useEffect(() => {
    if (isDashboard) {
      return;
    }

    const cached = entityCache?.get(entityCacheKey);

    if (cached && reloadKey === 0) {
      setConversation(cached.conversation);
      setMessages(cached.messages);
      setNextCursor(cached.nextCursor);
      setHasMore(cached.hasMore);
      setIsHydrating(false);
      setHydrateError(null);
      setPaginationError(null);
      setComposerValue("");
      shouldScrollToBottomRef.current = true;
      return;
    }

    const controller = new AbortController();

    setIsHydrating(true);
    setHydrateError(null);
    setPaginationError(null);
    setHasMore(false);
    setNextCursor(null);
    setMessages([]);
    setComposerValue("");

    fetchConversation({
      businessSlug,
      surface,
      entityId,
      signal: controller.signal,
    })
      .then(async ({ conversation: nextConversation }) => {
        setConversation(nextConversation);
        const page = await fetchMessagePage({
          conversationId: nextConversation.id,
          signal: controller.signal,
        });

        const loadedMessages = page.messages.map((message) =>
          mapAiMessageToChatMessage(message, userName),
        );

        setMessages(loadedMessages);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        shouldScrollToBottomRef.current = true;

        onEntityCacheUpdate?.(entityCacheKey, {
          conversation: nextConversation,
          messages: loadedMessages,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setConversation(null);
        setMessages([]);
        setHydrateError(
          error instanceof Error
            ? error.message
            : "Saved assistant messages could not be loaded.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsHydrating(false);
        }
      });

    return () => controller.abort();
  }, [
    isDashboard,
    businessSlug,
    entityCache,
    entityCacheKey,
    entityId,
    reloadKey,
    surface,
    userName,
    onEntityCacheUpdate,
  ]);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;

    if (!el) {
      return;
    }

    const prependSnapshot = prependSnapshotRef.current;

    if (prependSnapshot) {
      el.scrollTop = getScrollTopAfterPrepend({
        previousScrollHeight: prependSnapshot.scrollHeight,
        previousScrollTop: prependSnapshot.scrollTop,
        nextScrollHeight: el.scrollHeight,
      });
      prependSnapshotRef.current = null;
      return;
    }

    if (shouldScrollToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      shouldScrollToBottomRef.current = false;
      setShowScrollToBottom(false);
    }
  }, [messages, isHydrating]);

  function scrollToBottom() {
    const el = scrollContainerRef.current;

    if (!el) {
      return;
    }

    el.scrollTop = el.scrollHeight;
    setShowScrollToBottom(false);
  }

  function prepareIncomingMessageScroll(force = false) {
    const el = scrollContainerRef.current;

    if (
      force ||
      !el ||
      isScrollNearBottom({
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight,
      })
    ) {
      shouldScrollToBottomRef.current = true;
      setShowScrollToBottom(false);
      return;
    }

    shouldScrollToBottomRef.current = false;
    setShowScrollToBottom(true);
  }

  function updateMessage(
    messageId: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId ? updater(message) : message,
      ),
    );
  }

  function appendAssistantNote(content: string, isError = false) {
    prepareIncomingMessageScroll(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createMessageId(),
        role: "assistant",
        label: isError ? "Requo AI error" : "Requo AI",
        content,
        isError,
        status: isError ? "failed" : "completed",
        title: isError ? "Check that request" : undefined,
      },
    ]);
  }

  async function loadMessagesForConversation(nextConversation: AiConversation) {
    setConversation(nextConversation);
    setHistoryOpen(false);
    setHydrateError(null);
    setPaginationError(null);
    setComposerValue("");

    if (nextConversation.surface === "dashboard") {
      onActiveDashboardConversationChange?.(nextConversation);
      loadingDashboardConversationIdRef.current = nextConversation.id;
    }

    // Use cached messages if available
    const cached = messagesCache?.get(nextConversation.id);

    if (cached) {
      loadingDashboardConversationIdRef.current = null;
      setMessages(cached.messages);
      setNextCursor(cached.nextCursor);
      setHasMore(cached.hasMore);
      setIsHydrating(false);
      shouldScrollToBottomRef.current = true;
      if (nextConversation.surface === "dashboard") {
        upsertDashboardConversationSummary(
          createDashboardConversationSummary({
            conversation: nextConversation,
            messages: cached.messages,
          }),
        );
      }
      return;
    }

    setIsHydrating(true);
    setMessages([]);

    try {
      const page = await fetchMessagePage({
        conversationId: nextConversation.id,
      });

      const loadedMessages = page.messages.map((message) =>
        mapAiMessageToChatMessage(message, userName),
      );

      setMessages(loadedMessages);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      shouldScrollToBottomRef.current = true;

      // Cache the loaded messages
      onMessagesCacheUpdate?.(nextConversation.id, {
        messages: loadedMessages,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      });

      if (nextConversation.surface === "dashboard") {
        upsertDashboardConversationSummary(
          createDashboardConversationSummary({
            conversation: nextConversation,
            messages: loadedMessages,
          }),
        );
      }
    } catch (error) {
      setHydrateError(
        error instanceof Error
          ? error.message
          : "Saved assistant messages could not be loaded.",
      );
    } finally {
      loadingDashboardConversationIdRef.current = null;
      setIsHydrating(false);
    }
  }

  async function loadOlderMessages() {
    if (
      !conversation ||
      !hasMore ||
      !nextCursor ||
      loadingOlderRef.current ||
      isLoadingOlder
    ) {
      return;
    }

    const el = scrollContainerRef.current;

    prependSnapshotRef.current = el
      ? {
          scrollHeight: el.scrollHeight,
          scrollTop: el.scrollTop,
        }
      : null;
    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    setPaginationError(null);

    try {
      const page = await fetchMessagePage({
        conversationId: conversation.id,
        before: nextCursor,
      });
      const olderMessages = page.messages.map((message) =>
        mapAiMessageToChatMessage(message, userName),
      );

      if (!olderMessages.length) {
        prependSnapshotRef.current = null;
      }

      setMessages((currentMessages) =>
        mergeChronologicalMessages(olderMessages, currentMessages),
      );
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      prependSnapshotRef.current = null;
      setPaginationError(
        error instanceof Error
          ? error.message
          : "Older messages could not be loaded.",
      );
    } finally {
      loadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }

  function handleTranscriptScroll() {
    const el = scrollContainerRef.current;

    if (!el) {
      return;
    }

    if (
      isScrollNearBottom({
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight,
      })
    ) {
      setShowScrollToBottom(false);
    }

    if (el.scrollTop <= topLoadThreshold) {
      void loadOlderMessages();
    }
  }

  async function loadDashboardHistory(forceRefresh = false) {
    if (surface !== "dashboard") {
      return;
    }

    setHistoryOpen(true);

    // Reuse cached list unless explicitly refreshing
    if (!forceRefresh && cachedDashboardConversations != null) {
      setHistoryConversations(cachedDashboardConversations);
      return;
    }

    setIsHistoryLoading(true);

    try {
      const response = await fetch(
        getDashboardConversationsEndpoint({ businessSlug, entityId }),
        {
          headers: {
            accept: "application/json",
          },
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

      const payload = (await response.json()) as {
        conversations: AiConversationSummary[];
      };

      syncDashboardConversations(payload.conversations);
    } catch (error) {
      console.error("Failed to load dashboard AI history.", error);
      setHistoryConversations([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function createNewDashboardChat() {
    if (surface !== "dashboard" || isPending || isCreatingChat) {
      return;
    }

    setIsCreatingChat(true);

    try {
      const response = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          businessSlug,
          surface: "dashboard",
          entityId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getJsonErrorMessage(
            response,
            "A new dashboard chat could not be created.",
          ),
        );
      }

      const payload = (await response.json()) as {
        conversation: AiConversation;
      };

      setComposerValue("");
      setConversation(payload.conversation);
      setHistoryOpen(false);
      setMessages([]);
      setNextCursor(null);
      setHasMore(false);
      setHydrateError(null);
      setPaginationError(null);
      setIsHydrating(false);
      shouldScrollToBottomRef.current = true;
      onActiveDashboardConversationChange?.(payload.conversation);
      onMessagesCacheUpdate?.(payload.conversation.id, {
        messages: [],
        nextCursor: null,
        hasMore: false,
      });
      upsertDashboardConversationSummary(
        createDashboardConversationSummary({
          conversation: payload.conversation,
          messages: [],
        }),
      );
    } catch (error) {
      appendAssistantNote(
        error instanceof Error
          ? error.message
          : "A new dashboard chat could not be created.",
        true,
      );
    } finally {
      setIsCreatingChat(false);
    }
  }

  async function runMessage(messageText: string) {
    if (isPending || !conversation) {
      return;
    }

    const trimmedMessage = messageText.trim();

    if (!trimmedMessage) {
      appendAssistantNote("Type a question before sending it to the assistant.", true);
      return;
    }

    const userMessageId = createMessageId();
    let assistantMessageId = createMessageId();
    let renderedContent = "";
    let terminalEvent: AssistantTerminalEvent | null = null;
    let currentConversation = conversation;

    streamingConversationIdRef.current = conversation.id;
    prepareIncomingMessageScroll(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: userMessageId,
        role: "user",
        label: userName,
        content: trimmedMessage,
        status: "completed",
      },
      {
        id: assistantMessageId,
        role: "assistant",
        label: "Requo AI",
        content: "",
        pending: true,
        status: "generating",
      },
    ]);
    setIsPending(true);
    setComposerValue("");

    function replacePersistedMessages(
      event: Extract<AiChatStreamEvent, { type: "messages" }>,
    ) {
      const savedUserMessage = mapAiMessageToChatMessage(
        event.userMessage,
        userName,
      );
      const savedAssistantMessage = mapAiMessageToChatMessage(
        event.assistantMessage,
        userName,
      );
      const previousAssistantMessageId = assistantMessageId;

      assistantMessageId = event.assistantMessage.id;

      setMessages((currentMessages) => {
        let didReplaceUser = false;
        let didReplaceAssistant = false;
        const nextMessages = currentMessages.map((message) => {
          if (message.id === userMessageId) {
            didReplaceUser = true;
            return savedUserMessage;
          }

          if (message.id === previousAssistantMessageId) {
            didReplaceAssistant = true;
            return savedAssistantMessage;
          }

          return message;
        });

        if (!didReplaceUser) {
          nextMessages.push(savedUserMessage);
        }

        if (!didReplaceAssistant) {
          nextMessages.push(savedAssistantMessage);
        }

        return nextMessages;
      });
    }

    function finalizeTerminalEvent(event: AssistantTerminalEvent) {
      const hasContent = renderedContent.trim().length > 0;

      if (event.type === "done") {
        updateMessage(assistantMessageId, (message) => ({
          ...message,
          content: hasContent
            ? message.content
            : "The assistant returned an empty response. Try again.",
          isError: !hasContent,
          pending: false,
          status: hasContent ? "completed" : "failed",
          title: hasContent ? message.title : "Could not complete that request",
          statusNote: event.truncated
            ? {
                content: aiAssistantTruncationMessage,
                tone: "muted",
              }
            : message.statusNote,
        }));
        return;
      }

      updateMessage(assistantMessageId, (message) => ({
        ...message,
        pending: false,
        status: "failed",
        isError: !hasContent,
        content: hasContent ? message.content : event.message,
        title: hasContent ? message.title : "Could not complete that request",
        statusNote: hasContent
          ? {
              content: event.message,
              tone: "error",
            }
          : undefined,
      }));
    }

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          businessSlug,
          conversationId: conversation.id,
          surface,
          entityId,
          message: trimmedMessage,
        }),
      });

      if (!response.ok) {
        const errorMessage = await getJsonErrorMessage(
          response,
          "The assistant could not generate an answer right now. Try again in a moment.",
        );

        updateMessage(assistantMessageId, (message) => ({
          ...message,
          content: errorMessage,
          isError: true,
          pending: false,
          status: "failed",
          title: "Could not complete that request",
        }));
        return;
      }

      await consumeStream(response, (event) => {
        switch (event.type) {
          case "conversation":
            currentConversation = event.conversation;
            setConversation(event.conversation);
            if (
              event.conversation.surface === "dashboard" &&
              activeDashboardConversation?.id !== event.conversation.id
            ) {
              onActiveDashboardConversationChange?.(event.conversation);
            }
            break;
          case "messages":
            replacePersistedMessages(event);
            break;
          case "meta":
            updateMessage(assistantMessageId, (message) => ({
              ...message,
              title: event.title,
              model: event.model,
            }));
            break;
          case "delta":
            renderedContent += event.value;
            prepareIncomingMessageScroll();
            updateMessage(assistantMessageId, (message) => ({
              ...message,
              content: `${message.content}${event.value}`,
            }));
            break;
          case "done":
            terminalEvent = event;
            break;
          case "error":
            terminalEvent = event;
            break;
        }
      });

      if (terminalEvent) {
        finalizeTerminalEvent(terminalEvent);
      } else {
        updateMessage(assistantMessageId, (message) => ({
          ...message,
          pending: false,
          status: renderedContent.trim() ? "completed" : "failed",
          isError: !renderedContent.trim(),
          content: renderedContent.trim()
            ? message.content
            : "The stream ended unexpectedly. Try again if you need a fresh reply.",
          title: renderedContent.trim()
            ? message.title
            : "Could not complete that request",
        }));
      }
    } catch (error) {
      console.error("Failed to stream AI request.", error);

      updateMessage(assistantMessageId, (message) => {
        const hasContent = renderedContent.trim().length > 0;

        return {
          ...message,
          content: hasContent
            ? message.content
            : "The assistant could not respond right now. Try again in a moment.",
          isError: !hasContent,
          pending: false,
          status: hasContent ? "completed" : "failed",
          title: hasContent ? message.title : "Could not complete that request",
          statusNote: hasContent
            ? {
                content:
                  "The assistant could not respond right now. Try again in a moment.",
                tone: "error",
              }
            : undefined,
        };
      });
    } finally {
      setIsPending(false);
      streamingConversationIdRef.current = null;

      // Update message cache after streaming completes
      if (currentConversation) {
        setMessages((currentMessages) => {
          onMessagesCacheUpdate?.(currentConversation.id, {
            messages: currentMessages,
            nextCursor,
            hasMore,
          });

          if (currentConversation.surface === "dashboard") {
            queueMicrotask(() =>
              upsertDashboardConversationSummary(
                createDashboardConversationSummary({
                  conversation: currentConversation,
                  messages: currentMessages,
                }),
              ),
            );
          }

          // Also update entity cache so navigation back is instant
          if (!isDashboard) {
            onEntityCacheUpdate?.(entityCacheKey, {
              conversation: currentConversation,
              messages: currentMessages,
              nextCursor,
              hasMore,
            });
          }

          return currentMessages;
        });
      }
    }
  }

  const placeholder =
    surface === "inquiry"
      ? "Ask about this inquiry, or draft a follow-up..."
      : surface === "quote"
        ? "Ask for quote wording, terms, notes, or follow-up..."
        : "Ask about this business's inquiries, quotes, and follow-ups...";

  const panelTitle = title ?? "Requo AI";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="surface-card-footer flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/logo.svg"
            alt=""
            width={24}
            height={24}
            className="size-6 object-contain"
          />
          <h2 className="truncate font-heading text-base font-semibold text-primary">
            {panelTitle}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          {surface === "dashboard" ? (
            <>
              <Button
                aria-label="New chat"
                disabled={isPending || isCreatingChat}
                onClick={() => void createNewDashboardChat()}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <MessageSquarePlus />
                <span className="sr-only">New chat</span>
              </Button>
              <Button
                aria-label="History"
                disabled={isPending || isCreatingChat}
                onClick={() => void loadDashboardHistory()}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <History />
                <span className="sr-only">History</span>
              </Button>
            </>
          ) : null}
          <Button
            aria-label="Close assistant"
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
            <span className="sr-only">Close assistant</span>
          </Button>
        </div>
      </div>

      {historyOpen && isDashboard ? (
        <DashboardChatHistoryList
          conversations={historyConversations}
          isLoading={isHistoryLoading}
          onSelect={(nextConversation) => {
            void loadMessagesForConversation(nextConversation);
          }}
        />
      ) : (
        <>
          <div className="relative min-h-0 flex-1">
            <div
              className="h-full overflow-y-auto"
              onScroll={handleTranscriptScroll}
              ref={scrollContainerRef}
            >
              <div className="flex min-h-full flex-col gap-4 px-4 py-4">
                <ChatMessageList
                  copyState={copyState}
                  hasMore={hasMore}
                  hydrateError={hydrateError}
                  isHydrating={isHydrating || isCreatingChat}
                  isLoadingOlder={isLoadingOlder}
                  loadingLabel={
                    isCreatingChat
                      ? "Creating a new chat..."
                      : "Loading saved assistant history..."
                  }
                  messages={messages}
                  onCopy={(targetMessage) =>
                    copyText(
                      targetMessage.content,
                      targetMessage.id,
                      setCopyState,
                    )
                  }
                  onReload={() => setReloadKey((key) => key + 1)}
                  paginationError={paginationError}
                />

                {!messages.length &&
                !isHydrating &&
                !hydrateError &&
                !isCreatingChat ? (
                  <div className="flex min-h-[17rem] flex-col justify-end gap-6">
                    <p className="rounded-2xl border border-border/70 bg-secondary/60 px-4 py-3 text-sm leading-6 text-muted-foreground">
                      No assistant messages yet. Ask a question or use a quick action.
                    </p>
                    <div className="flex w-full justify-end">
                      <div className="flex max-w-[92%] flex-col items-end gap-2">
                        {quickActions[surface].map((action) => (
                          <Button
                            disabled={isPending || isCreatingChat || !conversation}
                            key={action.label}
                            onClick={() => {
                              void runMessage(action.prompt);
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {showScrollToBottom ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <Button
                  className="pointer-events-auto rounded-full shadow-[var(--surface-shadow-md)]"
                  onClick={scrollToBottom}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ArrowDown data-icon="inline-start" />
                  New messages
                </Button>
              </div>
            ) : null}
          </div>

          <div className="border-t border-border/70 px-3 py-3">
            <ChatInput
              disabled={isPending || isCreatingChat || !conversation}
              onChange={setComposerValue}
              onSubmit={() => {
                void runMessage(composerValue);
              }}
              placeholder={placeholder}
              value={composerValue}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function AIChatPopover(props: AIChatPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDashboard = props.surface === "dashboard";
  const hasAccess = hasFeatureAccess(props.workspacePlan, "aiAssistant");
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
  const title = props.title ?? "Requo AI";
  const dashboardListWarmupStartedRef = useRef(false);
  const entityWarmupInFlightRef = useRef(new Map<string, Promise<void>>());
  const messagesWarmupInFlightRef = useRef(new Map<string, Promise<void>>());
  const entityCacheKey = getEntityConversationCacheKey(props.surface, props.entityId);

  // Pre-fetch dashboard conversation list on mount (persists across open/close)
  useEffect(() => {
    if (!isDashboard || !hasAccess) {
      return;
    }
    if (dashboardListWarmupStartedRef.current) {
      return;
    }
    dashboardListWarmupStartedRef.current = true;

    const controller = new AbortController();

    fetch(
      getDashboardConversationsEndpoint({
        businessSlug: props.businessSlug,
        entityId: props.entityId,
      }),
      {
        headers: { accept: "application/json" },
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          conversations: AiConversationSummary[];
        };

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
        // Silently fail — the panel will fetch on mount if cache is null
      });

    return () => controller.abort();
  }, [isDashboard, props.businessSlug, props.entityId, hasAccess]);

  const warmupEntityConversation = useCallback(() => {
    if (
      !shouldWarmupEntityConversation({
        surface: props.surface,
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
          businessSlug: props.businessSlug,
          surface: props.surface,
          entityId: props.entityId,
        });
        const page = await fetchMessagePage({ conversationId: conversation.id });
        const messages = page.messages.map((message) =>
          mapAiMessageToChatMessage(message, props.userName),
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
        // Let panel fallback to normal load path.
      } finally {
        entityWarmupInFlightRef.current.delete(entityCacheKey);
      }
    })();

    entityWarmupInFlightRef.current.set(entityCacheKey, request);
  }, [
    entityCache,
    entityCacheKey,
    hasAccess,
    messagesCache,
    props.businessSlug,
    props.entityId,
    props.surface,
    props.userName,
  ]);

  const warmupDashboardActiveConversation = useCallback(() => {
    const activeConversationId = activeDashboardConversation?.id ?? null;

    if (
      !shouldWarmupDashboardMessages({
        surface: props.surface,
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
        const page = await fetchMessagePage({ conversationId: activeConversationId });
        const messages = page.messages.map((message) =>
          mapAiMessageToChatMessage(message, props.userName),
        );

        messagesCache.set(activeConversationId, {
          messages,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
      } catch {
        // Let panel fallback to normal load path.
      } finally {
        messagesWarmupInFlightRef.current.delete(activeConversationId);
      }
    })();

    messagesWarmupInFlightRef.current.set(activeConversationId, request);
  }, [
    activeDashboardConversation,
    hasAccess,
    messagesCache,
    props.surface,
    props.userName,
  ]);

  const warmupOnOpenIntent = useCallback(() => {
    if (!hasAccess) {
      return;
    }

    warmupEntityConversation();
    warmupDashboardActiveConversation();
  }, [hasAccess, warmupDashboardActiveConversation, warmupEntityConversation]);

  useEffect(() => {
    if (isOpen) {
      warmupOnOpenIntent();
    }
  }, [isOpen, warmupOnOpenIntent]);

  function handleMessagesCacheUpdate(
    conversationId: string,
    snapshot: ConversationMessagesSnapshot,
  ) {
    messagesCache.set(conversationId, snapshot);
  }

  function handleEntityCacheUpdate(
    key: string,
    snapshot: EntityConversationSnapshot,
  ) {
    entityCache.set(key, snapshot);
  }

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
            data-testid={`${props.surface}-ai-launcher`}
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
          data-testid={`${props.surface}-ai-dialog`}
          onOpenAutoFocus={(event) => event.preventDefault()}
          side="top"
          sideOffset={18}
        >
                    {hasAccess ? (
            <AIChatPanel
              {...props}
              activeDashboardConversation={
                isDashboard ? activeDashboardConversation : null
              }
              cachedDashboardConversations={cachedConversations}
              entityCache={entityCache}
              messagesCache={messagesCache}
              onActiveDashboardConversationChange={setActiveDashboardConversation}
              onClose={() => setIsOpen(false)}
              onDashboardConversationsChange={setCachedConversations}
              onEntityCacheUpdate={handleEntityCacheUpdate}
              onMessagesCacheUpdate={handleMessagesCacheUpdate}
            />
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-[var(--surface-sunken-bg)] px-4 py-3">
                <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  {title}
                </h3>
                <div className="flex shrink-0 items-center gap-2">
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
              </div>
              <div className="flex flex-1 flex-col justify-center p-4">
                <LockedFeaturePage
                  className="border-none shadow-none px-4 py-8"
                  feature="aiAssistant"
                  plan={props.workspacePlan}
                />
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
