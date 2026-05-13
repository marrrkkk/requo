"use client";

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  Check,
  Copy,
  History,
  MessageSquarePlus,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type {
  AiChatStreamEvent,
  AiConversation,
  AiConversationSummary,
  AiSurface,
} from "@/features/ai/types";
import { aiAssistantTruncationMessage } from "@/features/ai/types";
import {
  aiQuickActions,
  consumeStream,
  createDashboardConversationSummary,
  createMessageId,
  fetchDashboardConversations,
  fetchConversation,
  fetchMessagePage,
  formatConversationTime,
  getEntityConversationCacheKey,
  getJsonErrorMessage,
  getPanelPlaceholder,
  getScrollTopAfterPrepend,
  isScrollNearBottom,
  mapAiMessageToChatMessage,
  mergeChronologicalMessages,
  mergeDashboardConversationSummary,
  shouldSkipDashboardConversationHydration,
  topLoadThreshold,
  type ChatMessage,
  type ConversationMessagesSnapshot,
  type EntityConversationSnapshot,
} from "@/features/ai/components/ai-chat-helpers";
import { cn } from "@/lib/utils";

type AiChatPanelProps = {
  businessSlug: string;
  entityId: string;
  surface: AiSurface;
  userName: string;
  title: string;
  activeDashboardConversation?: AiConversation | null;
  cachedDashboardConversations?: AiConversationSummary[] | null;
  entityCache?: Map<string, EntityConversationSnapshot>;
  messagesCache?: Map<string, ConversationMessagesSnapshot>;
  onClose: () => void;
  onActiveDashboardConversationChange?: (
    conversation: AiConversation | null,
  ) => void;
  onDashboardConversationsChange?: (
    conversations: AiConversationSummary[],
  ) => void;
  onEntityCacheUpdate?: (
    key: string,
    snapshot: EntityConversationSnapshot,
  ) => void;
  onMessagesCacheUpdate?: (
    conversationId: string,
    snapshot: ConversationMessagesSnapshot,
  ) => void;
};

type CopyState = "idle" | "copied" | "error";

type MessageCopyState = {
  messageId: string;
  state: CopyState;
} | null;

type AssistantTerminalEvent = Extract<
  AiChatStreamEvent,
  { type: "done" | "error" }
>;

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

function getSurfaceEyebrow(surface: AiSurface) {
  switch (surface) {
    case "inquiry":
      return "Scoped to this inquiry";
    case "quote":
      return "Scoped to this quote";
    default:
      return "Across all inquiries and quotes";
  }
}

function formatRelativeTime(value: string | null) {
  if (!value) return "No messages yet";

  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) return "No messages yet";

  const delta = Date.now() - parsed;

  if (delta < 45_000) return "Just now";

  try {
    return `${formatDistanceToNowStrict(new Date(parsed), {
      addSuffix: false,
    })} ago`;
  } catch {
    return formatConversationTime(value);
  }
}

/* -------------------------------------------------------------------------- */
/*  Message bubble                                                             */
/* -------------------------------------------------------------------------- */

type AssistantBubbleProps = {
  message: ChatMessage;
  isCopied: boolean;
  isCopyError: boolean;
  onCopy: (message: ChatMessage) => void;
};

const StreamingIndicator = memo(function StreamingIndicator() {
  return (
    <span
      aria-hidden="true"
      className="ai-stream-cursor inline-block h-[1.1em] w-[2px] translate-y-[0.15em] rounded-full bg-primary/80 align-middle"
    />
  );
});

const AssistantMessageBody = memo(function AssistantMessageBody({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  // While streaming, render plain pre-wrapped text plus a cursor. This avoids
  // re-parsing markdown on every delta, which was the previous perf bottleneck.
  if (isStreaming) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
        {content}
        <StreamingIndicator />
      </p>
    );
  }

  return (
    <div className="ai-prose text-sm leading-6 text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
});

const AssistantBubble = memo(function AssistantBubble({
  message,
  isCopied,
  isCopyError,
  onCopy,
}: AssistantBubbleProps) {
  const hasContent = message.content.trim().length > 0;
  const showPendingOnly = message.pending && !hasContent;
  const canCopy = !message.isError && hasContent && !message.pending;
  const modelLabel = message.model;

  return (
    <div className="flex w-full justify-start">
      <div className="flex max-w-[92%] flex-col gap-2">
        <div
          className={cn(
            "group/assistant w-full rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-[var(--surface-shadow-sm)]",
            message.isError && "border-destructive/40 bg-destructive/5",
          )}
        >
          {showPendingOnly ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner aria-hidden="true" data-icon="inline-start" />
              Thinking...
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {message.isError ? (
                <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                  <AlertTriangle
                    aria-hidden="true"
                    className="size-3.5"
                  />
                  {message.title ?? "Could not complete that request"}
                </div>
              ) : message.title ? (
                <h3 className="font-heading text-[0.95rem] font-semibold text-foreground">
                  {message.title}
                </h3>
              ) : null}

              <AssistantMessageBody
                content={message.content}
                isStreaming={Boolean(message.pending)}
              />

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

              {canCopy || modelLabel ? (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span
                    className={cn(
                      "truncate font-mono text-[0.68rem] text-muted-foreground",
                      !modelLabel && "invisible",
                    )}
                  >
                    {modelLabel ?? ""}
                  </span>
                  {canCopy ? (
                    <button
                      aria-label={
                        isCopied
                          ? "Copied"
                          : isCopyError
                            ? "Copy failed"
                            : "Copy response"
                      }
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onCopy(message)}
                      type="button"
                    >
                      {isCopied ? (
                        <Check aria-hidden="true" className="size-3.5" />
                      ) : (
                        <Copy aria-hidden="true" className="size-3.5" />
                      )}
                      {isCopied ? "Copied" : isCopyError ? "Copy failed" : "Copy"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const UserBubble = memo(function UserBubble({
  message,
}: {
  message: ChatMessage;
}) {
  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[88%] rounded-2xl bg-primary px-3.5 py-2.5 text-primary-foreground shadow-[var(--control-shadow)]">
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {message.content}
        </p>
      </div>
    </div>
  );
});

function MessageRow({
  message,
  copyState,
  onCopy,
}: {
  message: ChatMessage;
  copyState: MessageCopyState;
  onCopy: (message: ChatMessage) => void;
}) {
  if (message.role === "user") {
    return <UserBubble message={message} />;
  }

  const isCopied =
    copyState?.messageId === message.id && copyState.state === "copied";
  const isCopyError =
    copyState?.messageId === message.id && copyState.state === "error";

  return (
    <AssistantBubble
      isCopied={isCopied}
      isCopyError={isCopyError}
      message={message}
      onCopy={onCopy}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Transcript list                                                            */
/* -------------------------------------------------------------------------- */

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
        <div className="flex min-h-6 flex-col items-center justify-center gap-1 text-[0.7rem] text-muted-foreground">
          {isLoadingOlder ? (
            <span className="flex items-center gap-1.5">
              <Spinner aria-hidden="true" className="size-3" />
              Loading older messages...
            </span>
          ) : !hasMore && !isHydrating ? (
            <span className="tracking-[0.12em] uppercase">
              Start of conversation
            </span>
          ) : (
            <span className="sr-only">Scroll up to load older messages</span>
          )}
          {paginationError ? (
            <span className="text-destructive">{paginationError}</span>
          ) : null}
        </div>

        {messages.map((message) => (
          <MessageRow
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
        <AlertTriangle
          aria-hidden="true"
          className="size-6 text-muted-foreground"
        />
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

/* -------------------------------------------------------------------------- */
/*  Composer                                                                   */
/* -------------------------------------------------------------------------- */

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow the textarea to a max height without reflowing on every keystroke.
  useLayoutEffect(() => {
    const el = textareaRef.current;

    if (!el) return;

    el.style.height = "0px";
    const nextHeight = Math.min(el.scrollHeight, 140);
    el.style.height = `${nextHeight}px`;
  }, [value]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      className="flex items-end gap-2 rounded-2xl border border-border bg-background px-2.5 py-2 shadow-[var(--control-shadow)] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
      onSubmit={handleSubmit}
    >
      <Textarea
        className="min-h-9 max-h-[8.75rem] flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 shadow-none focus-visible:ring-0 focus-visible:border-0"
        disabled={disabled}
        maxLength={6000}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        value={value}
      />

      <Button
        aria-label="Send message"
        className="size-9 shrink-0 rounded-xl"
        disabled={disabled || !value.trim()}
        size="icon"
        type="submit"
      >
        {disabled ? <Spinner aria-hidden="true" /> : <SendHorizontal />}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({
  surface,
  disabled,
  onRun,
}: {
  surface: AiSurface;
  disabled: boolean;
  onRun: (prompt: string) => void;
}) {
  const headline =
    surface === "inquiry"
      ? "Draft, summarise, and qualify this inquiry."
      : surface === "quote"
        ? "Improve wording, terms, and follow-ups for this quote."
        : "Ask anything about this business's work.";

  return (
    <div className="flex min-h-full flex-col justify-end gap-5">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles aria-hidden="true" className="size-5" />
        </div>
        <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
          {headline}
        </h3>
        <p className="max-w-xs text-sm leading-6 text-muted-foreground">
          Only uses saved business context. Pick a quick action or type your own
          question.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {aiQuickActions[surface].map((action) => (
          <button
            className="rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left text-[0.82rem] leading-5 font-medium text-foreground transition-colors hover:border-border hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            key={action.label}
            onClick={() => onRun(action.prompt)}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard history list                                                     */
/* -------------------------------------------------------------------------- */

export function DashboardChatHistoryList({
  conversations,
  isLoading,
  onSelect,
  onCreateNew,
}: {
  conversations: AiConversationSummary[];
  isLoading: boolean;
  onSelect: (conversation: AiConversationSummary) => void;
  onCreateNew?: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="flex min-h-[16rem] items-center justify-center text-sm text-muted-foreground">
            <Spinner aria-hidden="true" />
          </div>
        ) : conversations.length ? (
          <div className="flex flex-col gap-1.5">
            {conversations.map((conversation) => (
              <button
                className="group/history flex flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-foreground">
                    {conversation.title ?? "New dashboard chat"}
                  </span>
                  <span className="shrink-0 text-[0.7rem] text-muted-foreground tabular-nums">
                    {formatRelativeTime(conversation.lastMessageAt)}
                  </span>
                </div>
                <span className="line-clamp-2 text-[0.82rem] leading-5 text-muted-foreground">
                  {conversation.lastMessagePreview ?? "No messages yet"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center text-sm leading-6 text-muted-foreground">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquarePlus aria-hidden="true" className="size-5" />
            </div>
            <p className="max-w-xs">
              Start your first dashboard chat to summarise inquiries, plan
              follow-ups, or draft quotes.
            </p>
            {onCreateNew ? (
              <Button
                onClick={onCreateNew}
                size="sm"
                type="button"
                variant="outline"
              >
                <MessageSquarePlus data-icon="inline-start" />
                New chat
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main panel                                                                 */
/* -------------------------------------------------------------------------- */

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
}: AiChatPanelProps) {
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
    () =>
      initialDashboardMessages?.messages ??
      initialEntitySnapshot?.messages ??
      [],
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
    () =>
      initialDashboardMessages?.hasMore ??
      initialEntitySnapshot?.hasMore ??
      false,
  );
  const [nextCursor, setNextCursor] = useState<string | null>(
    () =>
      initialDashboardMessages?.nextCursor ??
      initialEntitySnapshot?.nextCursor ??
      null,
  );
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(
    () => isDashboard && !activeDashboardConversation,
  );
  const [historyConversations, setHistoryConversations] = useState<
    AiConversationSummary[]
  >(cachedDashboardConversations ?? []);
  const [isHistoryLoading, setIsHistoryLoading] = useState(
    isDashboard && !hasCachedList,
  );
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
  const messagesRef = useRef<ChatMessage[]>(messages);
  const scrollFrameRef = useRef<number | null>(null);

  activeConversationIdRef.current = conversation?.id ?? null;
  hasLocalMessagesRef.current = messages.length > 0;
  messagesRef.current = messages;

  const historyConversationsRef = useRef(historyConversations);

  historyConversationsRef.current = historyConversations;

  const syncDashboardConversations = useCallback(
    (next: AiConversationSummary[]) => {
      setHistoryConversations(next);
      onDashboardConversationsChange?.(next);
    },
    [onDashboardConversationsChange],
  );

  const upsertDashboardConversationSummary = useCallback(
    (summary: AiConversationSummary) => {
      const next = mergeDashboardConversationSummary(
        historyConversationsRef.current,
        summary,
      );

      historyConversationsRef.current = next;
      setHistoryConversations(next);
      onDashboardConversationsChange?.(next);
    },
    [onDashboardConversationsChange],
  );

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
          streamingConversationIdRef.current ===
          activeDashboardConversation.id,
        nextConversationId: activeDashboardConversation.id,
      })
    ) {
      return;
    }

    if (
      loadingDashboardConversationIdRef.current ===
      activeDashboardConversation.id
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

  useEffect(() => {
    if (!isDashboard || hasCachedList) {
      return;
    }

    const controller = new AbortController();

    if (!activeDashboardConversation) {
      setHistoryOpen(true);
    }
    setIsHistoryLoading(true);

    fetchDashboardConversations({
      businessSlug,
      entityId,
      signal: controller.signal,
    })
      .then((payload) => {
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

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;

    if (!el) {
      return;
    }

    el.scrollTop = el.scrollHeight;
    setShowScrollToBottom(false);
  }, []);

  const prepareIncomingMessageScroll = useCallback((force = false) => {
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
  }, []);

  const updateMessage = useCallback(
    (messageId: string, updater: (message: ChatMessage) => ChatMessage) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageId ? updater(message) : message,
        ),
      );
    },
    [],
  );

  const appendAssistantNote = useCallback(
    (content: string, isError = false) => {
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
    },
    [prepareIncomingMessageScroll],
  );

  const loadMessagesForConversation = useCallback(
    async (nextConversation: AiConversation) => {
      setConversation(nextConversation);
      setHistoryOpen(false);
      setHydrateError(null);
      setPaginationError(null);
      setComposerValue("");

      if (nextConversation.surface === "dashboard") {
        onActiveDashboardConversationChange?.(nextConversation);
        loadingDashboardConversationIdRef.current = nextConversation.id;
      }

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
    },
    [
      messagesCache,
      onActiveDashboardConversationChange,
      onMessagesCacheUpdate,
      upsertDashboardConversationSummary,
      userName,
    ],
  );

  const loadOlderMessages = useCallback(async () => {
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
  }, [conversation, hasMore, nextCursor, isLoadingOlder, userName]);

  // rAF-throttled transcript scroll handler. Avoids a setState per scroll event
  // which can fire hundreds of times per second during streaming.
  const handleTranscriptScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;

      const el = scrollContainerRef.current;

      if (!el) return;

      const nearBottom = isScrollNearBottom({
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight,
      });

      startTransition(() => {
        setShowScrollToBottom((current) => (nearBottom ? false : current));
      });

      if (el.scrollTop <= topLoadThreshold) {
        void loadOlderMessages();
      }
    });
  }, [loadOlderMessages]);

  const refreshDashboardHistory = useCallback(
    async (forceRefresh = false) => {
      if (surface !== "dashboard") {
        return;
      }

      setHistoryOpen(true);

      if (!forceRefresh && cachedDashboardConversations != null) {
        setHistoryConversations(cachedDashboardConversations);
        return;
      }

      setIsHistoryLoading(true);

      try {
        const payload = await fetchDashboardConversations({
          businessSlug,
          entityId,
        });

        syncDashboardConversations(payload.conversations);
      } catch (error) {
        console.error("Failed to load dashboard AI history.", error);
        setHistoryConversations([]);
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [
      businessSlug,
      cachedDashboardConversations,
      entityId,
      surface,
      syncDashboardConversations,
    ],
  );

  const createNewDashboardChat = useCallback(async () => {
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
  }, [
    appendAssistantNote,
    businessSlug,
    entityId,
    isCreatingChat,
    isPending,
    onActiveDashboardConversationChange,
    onMessagesCacheUpdate,
    surface,
    upsertDashboardConversationSummary,
  ]);

  const runMessage = useCallback(
    async (messageText: string) => {
      if (isPending || !conversation) {
        return;
      }

      const trimmedMessage = messageText.trim();

      if (!trimmedMessage) {
        appendAssistantNote(
          "Type a question before sending it to the assistant.",
          true,
        );
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
            title: hasContent
              ? message.title
              : "Could not complete that request",
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
            title: hasContent
              ? message.title
              : "Could not complete that request",
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

        if (currentConversation) {
          const latestMessages = messagesRef.current;

          onMessagesCacheUpdate?.(currentConversation.id, {
            messages: latestMessages,
            nextCursor,
            hasMore,
          });

          if (currentConversation.surface === "dashboard") {
            queueMicrotask(() =>
              upsertDashboardConversationSummary(
                createDashboardConversationSummary({
                  conversation: currentConversation,
                  messages: messagesRef.current,
                }),
              ),
            );
          }

          if (!isDashboard) {
            onEntityCacheUpdate?.(entityCacheKey, {
              conversation: currentConversation,
              messages: latestMessages,
              nextCursor,
              hasMore,
            });
          }
        }
      }
    },
    [
      activeDashboardConversation,
      appendAssistantNote,
      businessSlug,
      conversation,
      entityCacheKey,
      entityId,
      hasMore,
      isDashboard,
      isPending,
      nextCursor,
      onActiveDashboardConversationChange,
      onEntityCacheUpdate,
      onMessagesCacheUpdate,
      prepareIncomingMessageScroll,
      surface,
      updateMessage,
      upsertDashboardConversationSummary,
      userName,
    ],
  );

  const handleCopy = useCallback(
    (targetMessage: ChatMessage) => {
      void copyText(targetMessage.content, targetMessage.id, setCopyState);
    },
    [setCopyState],
  );

  const handleReload = useCallback(
    () => setReloadKey((key) => key + 1),
    [],
  );

  const placeholder = useMemo(() => getPanelPlaceholder(surface), [surface]);
  const eyebrow = useMemo(() => getSurfaceEyebrow(surface), [surface]);

  const canOpenHistory = surface === "dashboard" && !historyOpen;
  const isInputDisabled = isPending || isCreatingChat || !conversation;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--surface-elevated-bg)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {canOpenHistory ? (
            <Button
              aria-label="Back to history"
              className="size-8"
              onClick={() => void refreshDashboardHistory()}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ArrowLeft />
            </Button>
          ) : (
            <Image
              alt=""
              className="size-7 object-contain"
              height={28}
              priority
              src="/logo.svg"
              width={28}
            />
          )}
          <div className="flex min-w-0 flex-col">
            <h2 className="truncate font-heading text-[0.95rem] font-semibold leading-tight tracking-tight text-foreground">
              {title}
            </h2>
            <span className="truncate text-[0.7rem] leading-tight text-muted-foreground">
              {eyebrow}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {surface === "dashboard" ? (
            <>
              <Button
                aria-label="New chat"
                className="size-8"
                disabled={isPending || isCreatingChat}
                onClick={() => void createNewDashboardChat()}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <MessageSquarePlus />
                <span className="sr-only">New chat</span>
              </Button>
              {!historyOpen ? (
                <Button
                  aria-label="History"
                  className="size-8"
                  disabled={isPending || isCreatingChat}
                  onClick={() => void refreshDashboardHistory()}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <History />
                  <span className="sr-only">History</span>
                </Button>
              ) : null}
            </>
          ) : null}
          <Button
            aria-label="Close assistant"
            className="size-8"
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
          onCreateNew={() => void createNewDashboardChat()}
          onSelect={(nextConversation) => {
            void loadMessagesForConversation(nextConversation);
          }}
        />
      ) : (
        <>
          <div className="relative min-h-0 flex-1">
            <div
              className="h-full overflow-y-auto overscroll-contain"
              onScroll={handleTranscriptScroll}
              ref={scrollContainerRef}
            >
              <div className="flex min-h-full flex-col gap-3 px-4 py-4">
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
                  onCopy={handleCopy}
                  onReload={handleReload}
                  paginationError={paginationError}
                />

                {!messages.length &&
                !isHydrating &&
                !hydrateError &&
                !isCreatingChat ? (
                  <EmptyState
                    disabled={isInputDisabled}
                    onRun={(prompt) => void runMessage(prompt)}
                    surface={surface}
                  />
                ) : null}
              </div>
            </div>

            {showScrollToBottom ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                <Button
                  aria-label="Scroll to latest"
                  className="pointer-events-auto size-9 rounded-full shadow-[var(--surface-shadow-md)]"
                  onClick={scrollToBottom}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ArrowDown />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="border-t border-border/70 px-3 pb-3 pt-2">
            <ChatInput
              disabled={isInputDisabled}
              onChange={setComposerValue}
              onSubmit={() => {
                void runMessage(composerValue);
              }}
              placeholder={placeholder}
              value={composerValue}
            />
            <p className="mt-1.5 px-1 text-[0.65rem] leading-4 text-muted-foreground">
              Enter to send. Shift + Enter for a new line.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
