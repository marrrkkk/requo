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
  useId,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { motion, LayoutGroup } from "framer-motion";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  History,
  MessageSquarePlus,
  Pin,
  SendHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BusinessPlan } from "@/lib/plans/plans";
import { hasFeatureAccess } from "@/lib/plans";
import { LockedAction } from "@/features/paywall";
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
  deleteConversation,
  fetchDashboardConversations,
  fetchConversation,
  fetchMessagePage,
  getAiChatSources,
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
  type AiChatSource,
  type ChatMessage,
  type ConversationMessagesSnapshot,
  type EntityConversationSnapshot,
} from "@/features/ai/components/ai-chat-helpers";
import {
  autoAiModelOptionValue,
  getAllAiModelOptions,
} from "@/lib/ai/model-options";
import {
  AiActionButton,
  parseActionProposals,
  stripActionProposals,
} from "@/features/ai/components/ai-action-button";

type AiChatPanelProps = {
  businessSlug: string;
  entityId: string;
  surface: AiSurface;
  userName: string;
  title: string;
  plan: BusinessPlan;
  activeDashboardConversation?: AiConversation | null;
  cachedDashboardConversations?: AiConversationSummary[] | null;
  entityCache?: Map<string, EntityConversationSnapshot>;
  messagesCache?: Map<string, ConversationMessagesSnapshot>;
  onClose: () => void;
  /** When true, hides the close button (used for full-page mode). */
  hideClose?: boolean;
  /** When "fullPage", removes compact panel styling and centers the input area. */
  variant?: "popover" | "fullPage";
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

const showAiChatDevTools = process.env.NODE_ENV === "development";
const aiChatDevModelOptions = getAllAiModelOptions();

const markdownComponents: Components = {
  a({ href, children, ...props }) {
    const isExternal = href ? /^https?:\/\//i.test(href) : false;

    // Normalize relative business paths that are missing the leading slash.
    // The AI model sometimes outputs `businesses/slug/...` instead of `/businesses/slug/...`.
    let normalizedHref = href;
    if (normalizedHref && !isExternal && !normalizedHref.startsWith("/") && normalizedHref.startsWith("businesses/")) {
      normalizedHref = `/${normalizedHref}`;
    }

    const isInternalRoute = normalizedHref && !isExternal && normalizedHref.startsWith("/");

    // Internal app links render as pill-style inline links
    if (isInternalRoute) {
      return (
        <a
          {...props}
          href={normalizedHref}
          className="inline-flex items-center gap-0.5 rounded-md bg-primary/8 px-1.5 py-0.5 text-primary no-underline transition-colors hover:bg-primary/15"
        >
          {children}
        </a>
      );
    }

    return (
      <a
        {...props}
        href={normalizedHref}
        rel={isExternal ? "noreferrer" : props.rel}
        target={isExternal ? "_blank" : props.target}
      >
        {children}
      </a>
    );
  },
  table({ children, ...props }) {
    return (
      <div className="overflow-x-auto rounded-lg">
        <table {...props}>{children}</table>
      </div>
    );
  },
};

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

function getSurfaceEyebrow(surface: AiSurface, entityId: string) {
  switch (surface) {
    case "inquiry":
      return entityId;
    case "quote":
      return entityId;
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Working late";
}

/* -------------------------------------------------------------------------- */
/*  Message bubble                                                             */
/* -------------------------------------------------------------------------- */

type AssistantBubbleProps = {
  message: ChatMessage;
  isCopied: boolean;
  isCopyError: boolean;
  onCopy: (message: ChatMessage) => void;
  showModelMetadata: boolean;
  sources?: AiChatSource[];
};

const ThinkingIndicator = memo(function ThinkingIndicator() {
  return (
    <div className="flex items-center py-1">
      <Shimmer duration={1.5} className="text-sm font-medium">
        Thinking
      </Shimmer>
    </div>
  );
});

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
  const proposals = isStreaming ? [] : parseActionProposals(content);
  // Always strip proposal blocks from displayed content (even during streaming)
  const displayContent = stripActionProposals(content);

  return (
    <div className="ai-prose text-sm leading-7 text-foreground">
      {displayContent ? (
        <ReactMarkdown
          components={markdownComponents}
          remarkPlugins={[remarkGfm]}
        >
          {displayContent}
        </ReactMarkdown>
      ) : null}
      {isStreaming ? <StreamingIndicator /> : null}
      {proposals.map((proposal, index) => (
        <AiActionButton key={`${proposal.action}-${index}`} proposal={proposal} />
      ))}
    </div>
  );
});

/** Extract internal app links from message content for the sources panel. */
function extractMessageLinks(content: string): Array<{ label: string; href: string }> {
  const linkPattern = /\[([^\]]+)\]\((\/[^)]+)\)/g;
  const links: Array<{ label: string; href: string }> = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(content)) !== null) {
    const href = match[2];
    if (!seen.has(href)) {
      seen.add(href);
      links.push({ label: match[1], href });
    }
  }

  return links;
}

const AssistantBubble = memo(function AssistantBubble({
  message,
  isCopied,
  isCopyError,
  onCopy,
  showModelMetadata,
}: AssistantBubbleProps) {
  const hasContent = message.content.trim().length > 0;
  const showPendingOnly = message.pending && !hasContent;
  const canCopy = !message.isError && hasContent && !message.pending;
  const modelLabel = showModelMetadata ? message.model : undefined;
  const messageLinks = hasContent ? extractMessageLinks(message.content) : [];
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className="flex w-full flex-col gap-1">
      {showPendingOnly ? (
        <ThinkingIndicator />
      ) : (
        <>
          {message.isError ? (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
              <span>{message.content || "Could not complete that request."}</span>
            </div>
          ) : (
            <AssistantMessageBody
              content={message.content}
              isStreaming={Boolean(message.pending)}
            />
          )}

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

          {/* Bottom toolbar — copy + sources */}
          {(canCopy || messageLinks.length > 0 || modelLabel) ? (
            <div className="mt-1 flex items-center gap-1">
              {canCopy ? (
                <button
                  aria-label={isCopied ? "Copied" : isCopyError ? "Copy failed" : "Copy response"}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onCopy(message)}
                  type="button"
                >
                  {isCopied ? (
                    <Check aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Copy aria-hidden="true" className="size-3.5" />
                  )}
                </button>
              ) : null}

              {messageLinks.length > 0 ? (
                <button
                  aria-label="View sources"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSourcesOpen(true)}
                  type="button"
                >
                  <span className="flex -space-x-1">
                    {messageLinks.slice(0, 3).map((_, i) => (
                      <span
                        className="flex size-4 items-center justify-center rounded-full border border-background bg-primary/15 text-[0.55rem] font-bold text-primary"
                        key={i}
                      >
                        {i + 1}
                      </span>
                    ))}
                  </span>
                  Sources
                </button>
              ) : null}

              {modelLabel ? (
                <span className="ml-auto truncate font-mono text-[0.62rem] text-muted-foreground/60">
                  {modelLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {showModelMetadata && message.debugInfo ? (
            <div className="mt-2 rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2 font-mono text-[0.65rem] leading-relaxed text-muted-foreground">
              <div className="mb-1 text-[0.7rem] font-semibold text-foreground/70">Debug</div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <span>Provider</span>
                <span>{message.debugInfo.provider}</span>
                <span>Model</span>
                <span>{message.debugInfo.model}</span>
                <span>Latency</span>
                <span>{message.debugInfo.latencyMs}ms</span>
                {message.debugInfo.inputTokens != null && (
                  <>
                    <span>Input tokens</span>
                    <span>{message.debugInfo.inputTokens.toLocaleString()}</span>
                  </>
                )}
                {message.debugInfo.outputTokens != null && (
                  <>
                    <span>Output tokens</span>
                    <span>{message.debugInfo.outputTokens.toLocaleString()}</span>
                  </>
                )}
                {message.debugInfo.totalTokens != null && (
                  <>
                    <span>Total tokens</span>
                    <span>{message.debugInfo.totalTokens.toLocaleString()}</span>
                  </>
                )}
                {message.debugInfo.steps != null && message.debugInfo.steps > 1 && (
                  <>
                    <span>Steps</span>
                    <span>{message.debugInfo.steps}</span>
                  </>
                )}
                {message.debugInfo.toolCalls && message.debugInfo.toolCalls.length > 0 && (
                  <>
                    <span>Tools used</span>
                    <span>{message.debugInfo.toolCalls.map((t) => t.name).join(", ")}</span>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Sources sheet */}
          {sourcesOpen && messageLinks.length > 0 ? (
            <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
              <div
                className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
                onClick={() => setSourcesOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute inset-y-0 right-0 w-full max-w-sm animate-in slide-in-from-right border-l border-border bg-popover shadow-xl duration-200">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
                    <h3 className="font-heading text-base font-semibold text-foreground">
                      Sources ({messageLinks.length})
                    </h3>
                    <Button
                      aria-label="Close sources"
                      className="size-8"
                      onClick={() => setSourcesOpen(false)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <X />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="flex flex-col gap-2">
                      {messageLinks.map((link, index) => (
                        <a
                          className="flex items-start gap-3 rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-accent"
                          href={link.href}
                          key={`${link.href}-${index}`}
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {link.label}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {link.href}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
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
      <div className="max-w-[85%] rounded-2xl bg-black/[0.06] dark:bg-white/[0.08] px-4 py-2.5">
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
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
  showModelMetadata,
  sources,
}: {
  message: ChatMessage;
  copyState: MessageCopyState;
  onCopy: (message: ChatMessage) => void;
  showModelMetadata: boolean;
  sources: AiChatSource[];
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
      showModelMetadata={showModelMetadata}
      sources={sources}
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
  showModelMetadata,
  sources,
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
  showModelMetadata?: boolean;
  sources?: AiChatSource[];
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
            showModelMetadata={showModelMetadata ?? false}
            sources={sources ?? []}
          />
        ))}
      </>
    );
  }

  if (isHydrating) {
    return (
      <div className="flex flex-col gap-4 px-1 py-4">
        {/* Skeleton assistant message */}
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        {/* Skeleton user message */}
        <div className="flex w-full justify-end">
          <Skeleton className="h-10 w-2/5 rounded-2xl" />
        </div>
        {/* Skeleton assistant message */}
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
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
  isGenerating,
}: {
  disabled: boolean;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** When true, applies a glowing border animation to the input. */
  isGenerating?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow the textarea to a max height without reflowing on every keystroke.
  useLayoutEffect(() => {
    const el = textareaRef.current;

    if (!el) return;

    el.style.height = "0px";
    const nextHeight = Math.min(el.scrollHeight, 140);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > 140 ? "auto" : "hidden";
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
      className={cn(
        "relative flex items-center rounded-2xl bg-muted/70 px-4 py-3 transition-shadow",
        isGenerating && "ai-glow-border",
      )}
      onSubmit={handleSubmit}
    >
      <textarea
        className="min-h-6 max-h-[8.75rem] flex-1 resize-none overflow-hidden border-none bg-transparent px-0 py-0 text-sm leading-6 text-foreground shadow-none outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
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
        className="ml-2 size-8 shrink-0 rounded-lg"
        disabled={disabled || !value.trim()}
        size="icon-sm"
        type="submit"
      >
        {disabled ? <Spinner aria-hidden="true" /> : <ArrowUp className="size-4" />}
      </Button>
    </form>
  );
}

function DevModelSelector({
  disabled,
  id,
  value,
  onChange,
}: {
  disabled: boolean;
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const groups = useMemo(() => {
    const autoGroup = {
      heading: "Smart Routing",
      options: [
        {
          value: autoAiModelOptionValue,
          label: "Auto",
          searchText: "auto smart capacity",
        },
      ],
    };

    const providerGroups = new Map<string, { label: string; value: string; searchText: string }[]>();
    for (const option of aiChatDevModelOptions) {
      const providerLabel = option.label.split(" / ")[0] ?? option.provider;
      if (!providerGroups.has(providerLabel)) {
        providerGroups.set(providerLabel, []);
      }
      providerGroups.get(providerLabel)!.push({
        value: option.value,
        label: option.model,
        searchText: `${providerLabel} ${option.model}`,
      });
    }

    return [
      autoGroup,
      ...Array.from(providerGroups.entries()).map(([heading, options]) => ({
        heading,
        options,
      })),
    ];
  }, []);

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2">
      <label
        className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"
        htmlFor={id}
      >
        Dev model
      </label>
      <div className="w-full max-w-[280px]">
        <Combobox
          buttonClassName="h-8 text-xs"
          contentClassName="max-h-[320px]"
          disabled={disabled}
          groups={groups}
          id={id}
          onValueChange={onChange}
          placeholder="Select model..."
          searchable
          searchPlaceholder="Search models..."
          value={value}
        />
      </div>
    </div>
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
  onDelete,
  pinnedIds,
  onTogglePin,
}: {
  conversations: AiConversationSummary[];
  isLoading: boolean;
  onSelect: (conversation: AiConversationSummary) => void;
  onCreateNew?: () => void;
  onDelete?: (conversationId: string) => void;
  pinnedIds?: Set<string>;
  onTogglePin?: (conversationId: string) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Sort: pinned first, then by lastMessageAt.
  const sortedConversations = useMemo(() => {
    if (!pinnedIds?.size) return conversations;

    return [...conversations].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      return 0;
    });
  }, [conversations, pinnedIds]);

  function handleConfirmDelete() {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget);
    }
    setDeleteTarget(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto ai-chat-scrollbar">
        <div className="mx-auto w-full max-w-2xl px-4 py-5">
          {isLoading ? (
            <div className="flex min-h-[16rem] items-center justify-center text-sm text-muted-foreground">
              <Spinner aria-hidden="true" />
            </div>
          ) : sortedConversations.length ? (
            <div className="flex flex-col gap-1">
              {sortedConversations.map((conversation) => {
                const isPinned = pinnedIds?.has(conversation.id) ?? false;

                return (
                  <div
                    className="group/history relative flex flex-col gap-1 rounded-xl px-4 py-3 transition-colors hover:bg-accent"
                    key={conversation.id}
                  >
                    <button
                      className="flex w-full flex-col gap-1.5 text-left"
                      onClick={() => onSelect(conversation)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3 pr-16">
                        <span className="truncate text-sm font-medium text-foreground">
                          {isPinned ? "📌 " : ""}
                          {conversation.title ?? "New chat"}
                        </span>
                        <span className="shrink-0 text-[0.7rem] text-muted-foreground tabular-nums">
                          {formatRelativeTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <span className="line-clamp-2 text-[0.82rem] leading-5 text-muted-foreground">
                        {conversation.lastMessagePreview ?? "No messages yet"}
                      </span>
                    </button>

                    {/* Per-item actions */}
                    <div className="absolute right-3 top-3 flex gap-0.5 opacity-0 transition-opacity group-hover/history:opacity-100">
                      {onTogglePin ? (
                        <button
                          aria-label={isPinned ? "Unpin" : "Pin"}
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            onTogglePin(conversation.id);
                          }}
                          title={isPinned ? "Unpin" : "Pin to top"}
                          type="button"
                        >
                          <Pin className={cn("size-3.5", isPinned && "text-primary")} />
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          aria-label="Delete"
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(conversation.id);
                          }}
                          title="Delete conversation"
                          type="button"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center text-sm leading-6 text-muted-foreground">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageSquarePlus aria-hidden="true" className="size-5" />
              </div>
              <p className="max-w-xs">
                Start your first chat to explore inquiries, plan follow-ups, or draft quotes.
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

      {/* Delete confirmation dialog */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="alertdialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDeleteTarget(null)}
            aria-hidden="true"
          />
          <div className="relative mx-4 w-full max-w-sm rounded-xl border border-border bg-popover p-6 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-heading text-base font-semibold text-foreground">
              Delete conversation?
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This will permanently remove this conversation and its messages. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                onClick={() => setDeleteTarget(null)}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleConfirmDelete}
                size="sm"
                type="button"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
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
  hideClose,
  messagesCache,
  plan,
  surface,
  title,
  userName,
  variant = "popover",
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
  const [devModel, setDevModel] = useState(autoAiModelOptionValue);
  const [isPending, setIsPending] = useState(false);
  const [isHydrating, setIsHydrating] = useState(() => {
    if (!hasFeatureAccess(plan, "aiAssistant")) {
      return false;
    }

    return isDashboard
      ? Boolean(activeDashboardConversation && !initialDashboardMessages)
      : !initialEntitySnapshot;
  });
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
    () => variant !== "fullPage" && isDashboard && !activeDashboardConversation,
  );
  const [historyConversations, setHistoryConversations] = useState<
    AiConversationSummary[]
  >(cachedDashboardConversations ?? []);
  const [isHistoryLoading, setIsHistoryLoading] = useState(
    isDashboard && !hasCachedList && hasFeatureAccess(plan, "aiAssistant"),
  );
  const [copyState, setCopyState] = useTimedCopyState();
  const devModelSelectId = useId();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();

    try {
      const stored = localStorage.getItem(`requo:pinned-chats:${businessSlug}`);

      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  function persistPinnedIds(next: Set<string>) {
    setPinnedIds(next);

    try {
      localStorage.setItem(
        `requo:pinned-chats:${businessSlug}`,
        JSON.stringify([...next]),
      );
    } catch {
      // localStorage full or unavailable — ignore.
    }
  }

  function handleTogglePin(conversationId: string) {
    const next = new Set(pinnedIds);

    if (next.has(conversationId)) {
      next.delete(conversationId);
    } else {
      next.add(conversationId);
    }

    persistPinnedIds(next);
  }

  async function handleDeleteConversation(conversationId: string) {
    // Optimistically remove from the list.
    setHistoryConversations((current) =>
      current.filter((c) => c.id !== conversationId),
    );

    // Remove from pinned if pinned.
    if (pinnedIds.has(conversationId)) {
      const next = new Set(pinnedIds);

      next.delete(conversationId);
      persistPinnedIds(next);
    }

    // If the deleted conversation is the active one, clear it.
    if (conversation?.id === conversationId) {
      setConversation(null);
      setMessages([]);
      setHistoryOpen(true);
    }

    try {
      await deleteConversation(conversationId);
    } catch (error) {
      console.error("Failed to delete conversation.", error);
      // Reload the list to restore the item if the server rejected.
      try {
        const payload = await fetchDashboardConversations({
          businessSlug,
          entityId,
        });

        setHistoryConversations(payload.conversations);
      } catch {
        // Best-effort recovery.
      }
    }
  }

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
    if (!isDashboard || hasCachedList || !hasFeatureAccess(plan, "aiAssistant")) {
      return;
    }

    const controller = new AbortController();

    if (!activeDashboardConversation) {
      if (variant !== "fullPage") {
        setHistoryOpen(true);
      }
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
    plan,
    hasCachedList,
    businessSlug,
    entityId,
    reloadKey,
    onDashboardConversationsChange,
    variant,
  ]);

  useEffect(() => {
    if (isDashboard) {
      return;
    }

    if (!hasFeatureAccess(plan, "aiAssistant")) {
      setIsHydrating(false);
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
    plan,
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

    // Reset to a fresh "new chat" state without creating a server-side conversation.
    // The conversation will be created lazily when the user sends their first message.
    setComposerValue("");
    setConversation(null);
    setHistoryOpen(false);
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setHydrateError(null);
    setPaginationError(null);
    setIsHydrating(false);
    shouldScrollToBottomRef.current = true;
    onActiveDashboardConversationChange?.(null);
  }, [
    isCreatingChat,
    isPending,
    onActiveDashboardConversationChange,
    surface,
  ]);

  const runMessage = useCallback(
    async (messageText: string) => {
      if (isPending) {
        return;
      }

      const trimmedMessage = messageText.trim();

      if (!trimmedMessage) {
        return;
      }

      // Lazy conversation creation for dashboard surface when no conversation exists yet.
      let activeConversation = conversation;

      if (!activeConversation && surface === "dashboard") {
        // Show user's message immediately — don't block on conversation creation
        try {
          const response = await fetch("/api/ai/conversations", {
            method: "POST",
            headers: { "content-type": "application/json" },
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
                "A new chat could not be created.",
              ),
            );
          }

          const payload = (await response.json()) as {
            conversation: AiConversation;
          };

          activeConversation = payload.conversation;
          setConversation(activeConversation);
          onActiveDashboardConversationChange?.(activeConversation);
          onMessagesCacheUpdate?.(activeConversation.id, {
            messages: [],
            nextCursor: null,
            hasMore: false,
          });
        } catch (error) {
          appendAssistantNote(
            error instanceof Error
              ? error.message
              : "A new chat could not be created.",
            true,
          );
          return;
        }
      }

      if (!activeConversation) {
        return;
      }

      const userMessageId = createMessageId();
      let assistantMessageId = createMessageId();
      let renderedContent = "";
      let terminalEvent: AssistantTerminalEvent | null = null;
      let currentConversation = activeConversation;

      streamingConversationIdRef.current = activeConversation.id;
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
            conversationId: activeConversation.id,
            surface,
            entityId,
            message: trimmedMessage,
            ...(showAiChatDevTools && devModel !== autoAiModelOptionValue
              ? { devModel }
              : {}),
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
            case "status":
              updateMessage(assistantMessageId, (message) => ({
                ...message,
                statusNote: { content: event.message, tone: "muted" as const },
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
            case "debug":
              updateMessage(assistantMessageId, (message) => ({
                ...message,
                debugInfo: event.info,
              }));
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
      devModel,
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
  const eyebrow = useMemo(() => getSurfaceEyebrow(surface, entityId), [surface, entityId]);
  const sources = useMemo(
    () => getAiChatSources({ businessSlug, entityId, surface }),
    [businessSlug, entityId, surface],
  );

  const canOpenHistory = surface === "dashboard" && !historyOpen;
  const isInputDisabled = isPending || isCreatingChat || (surface !== "dashboard" && !conversation);
  const hasAiAccess = hasFeatureAccess(plan, "aiAssistant");

  const panelContent = (
    <div className={cn("flex h-full min-h-0 flex-col", variant === "popover" && "bg-[var(--surface-elevated-bg)]")}>
      {/* Header — hidden in fullPage variant */}
      {variant !== "fullPage" ? (
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
              {hasAiAccess ? (
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
              ) : null}
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
            className={hideClose ? "hidden" : "size-8"}
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
      ) : null}

      {historyOpen && isDashboard ? (
        hasAiAccess ? (
          <div className="relative min-h-0 flex-1 flex flex-col">
            {variant === "fullPage" ? (
              <div className="flex items-center justify-end px-3 pt-1 sm:absolute sm:right-4 sm:top-3 sm:z-10 sm:p-0">
                <Button
                  aria-label="Back to chat"
                  disabled={isPending || isCreatingChat}
                  onClick={() => setHistoryOpen(false)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <ArrowLeft data-icon="inline-start" />
                  Back
                </Button>
              </div>
            ) : null}
            <DashboardChatHistoryList
            conversations={historyConversations}
            isLoading={isHistoryLoading}
            onCreateNew={() => void createNewDashboardChat()}
            onDelete={(id) => void handleDeleteConversation(id)}
            onSelect={(nextConversation) => {
              void loadMessagesForConversation(nextConversation);
            }}
            onTogglePin={handleTogglePin}
            pinnedIds={pinnedIds}
          />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-foreground">
                AI Assistant
              </p>
              <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                Get AI-drafted replies, quote suggestions, and follow-up ideas for your inquiries.
              </p>
            </div>
            <Button asChild size="sm">
              <a href="/account/billing">
                Upgrade to Pro
              </a>
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="relative min-h-0 flex-1">
            {/* Full-page inline action buttons — top bar on mobile, floating on desktop */}
            {variant === "fullPage" && hasAiAccess ? (
              <div className="flex items-center justify-end gap-1 px-3 pt-1 sm:absolute sm:right-4 sm:top-3 sm:z-10 sm:p-0">
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
              </div>
            ) : null}

            {/* Full-page new chat layout: greeting + input + quick actions + history */}
            {variant === "fullPage" &&
            !messages.length &&
            !isHydrating &&
            !hydrateError &&
            !isCreatingChat ? (
              <div className="flex h-full flex-col">
                <div className="flex flex-1 flex-col items-center justify-center px-4">
                  <div className="mx-auto w-full max-w-2xl">
                    {/* Greeting */}
                    <h1 className="mb-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {getGreeting()}, {userName.split(" ")[0]}
                    </h1>
                    <p className="mb-6 text-sm text-muted-foreground">
                      How can I help with your business today?
                    </p>

                    {/* Chat input */}
                    <motion.div layoutId="ai-chat-input" layout="position" initial={false} transition={{ layout: { duration: 0.35, ease: "easeInOut" } }}>
                      <ChatInput
                        disabled={isInputDisabled}
                        isGenerating={isPending}
                        onChange={setComposerValue}
                        onSubmit={() => {
                          void runMessage(composerValue);
                        }}
                        placeholder={placeholder}
                        value={composerValue}
                      />
                    </motion.div>

                    {/* Quick actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {aiQuickActions[surface].map((action, index) => {
                        const colors = [
                          "border-blue-200/80 bg-blue-100/50 text-blue-800 shadow-sm shadow-blue-100/50 hover:bg-blue-100 dark:border-blue-700/40 dark:bg-blue-900/30 dark:text-blue-200 dark:shadow-blue-900/20 dark:hover:bg-blue-900/50",
                          "border-purple-200/80 bg-purple-100/50 text-purple-800 shadow-sm shadow-purple-100/50 hover:bg-purple-100 dark:border-purple-700/40 dark:bg-purple-900/30 dark:text-purple-200 dark:shadow-purple-900/20 dark:hover:bg-purple-900/50",
                          "border-orange-200/80 bg-orange-100/50 text-orange-800 shadow-sm shadow-orange-100/50 hover:bg-orange-100 dark:border-orange-700/40 dark:bg-orange-900/30 dark:text-orange-200 dark:shadow-orange-900/20 dark:hover:bg-orange-900/50",
                          "border-teal-200/80 bg-teal-100/50 text-teal-800 shadow-sm shadow-teal-100/50 hover:bg-teal-100 dark:border-teal-700/40 dark:bg-teal-900/30 dark:text-teal-200 dark:shadow-teal-900/20 dark:hover:bg-teal-900/50",
                        ];
                        return (
                          <button
                            className={cn(
                              "rounded-full border px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                              colors[index % colors.length],
                            )}
                            disabled={isInputDisabled}
                            key={action.label}
                            onClick={() => void runMessage(action.prompt)}
                            type="button"
                          >
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent conversations — exclude empty chats, limit to 3 on mobile */}
                {(() => {
                  const nonEmpty = historyConversations.filter((c) => c.lastMessagePreview);
                  if (!nonEmpty.length) return null;
                  return (
                    <div className="mx-auto w-full max-w-2xl border-t border-border/50 px-4 py-4">
                      <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Recent
                      </p>
                      <div className="flex flex-col gap-1">
                        {/* Show 3 on mobile, 5 on desktop */}
                        {nonEmpty.slice(0, 3).map((conv) => (
                          <button
                            className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
                            key={conv.id}
                            onClick={() => void loadMessagesForConversation(conv)}
                            type="button"
                          >
                            <span className="truncate text-sm text-foreground">
                              {conv.title ?? "Untitled chat"}
                            </span>
                            <span className="shrink-0 text-[0.7rem] text-muted-foreground tabular-nums">
                              {formatRelativeTime(conv.lastMessageAt)}
                            </span>
                          </button>
                        ))}
                        {nonEmpty.slice(3, 5).map((conv) => (
                          <button
                            className="hidden sm:flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
                            key={conv.id}
                            onClick={() => void loadMessagesForConversation(conv)}
                            type="button"
                          >
                            <span className="truncate text-sm text-foreground">
                              {conv.title ?? "Untitled chat"}
                            </span>
                            <span className="shrink-0 text-[0.7rem] text-muted-foreground tabular-nums">
                              {formatRelativeTime(conv.lastMessageAt)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Normal chat layout (messages exist or popover variant) */
              <>
              <motion.div
                key="fullpage-chat"
                initial={variant === "fullPage" ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn("h-full overflow-y-auto overscroll-contain", variant === "fullPage" && "ai-chat-scrollbar")}
                onScroll={handleTranscriptScroll}
                ref={scrollContainerRef}
              >
                <div className={cn("flex min-h-full flex-col gap-3 px-4 py-4", variant === "fullPage" && "mx-auto w-full max-w-2xl px-4 py-6")}>
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
                    showModelMetadata={showAiChatDevTools}
                    sources={sources}
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
              </motion.div>

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
              </>
            )}
          </div>

          {/* Input area — hidden when fullPage new-chat layout is showing */}
          {!(variant === "fullPage" && !messages.length && !isHydrating && !hydrateError && !isCreatingChat) ? (
          <div className={cn("border-t border-border/70 px-3 pb-3 pt-2", variant === "fullPage" && "mx-auto w-full max-w-2xl px-4 pb-4 pt-3")}>
            {hasAiAccess ? (
              <>
                {showAiChatDevTools ? (
                  <DevModelSelector
                    disabled={isInputDisabled}
                    id={devModelSelectId}
                    onChange={setDevModel}
                    value={devModel}
                  />
                ) : null}
                <motion.div layoutId={variant === "fullPage" ? "ai-chat-input" : undefined} layout="position" initial={false} transition={{ layout: { duration: 0.35, ease: "easeInOut" } }}>
                  <ChatInput
                    disabled={isInputDisabled}
                    isGenerating={isPending}
                    onChange={setComposerValue}
                    onSubmit={() => {
                      void runMessage(composerValue);
                    }}
                    placeholder={placeholder}
                    value={composerValue}
                  />
                </motion.div>
              </>
            ) : (
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-2.5 py-2 shadow-[var(--control-shadow)]">
                <Textarea
                  className="min-h-9 max-h-[8.75rem] flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 shadow-none focus-visible:ring-0 focus-visible:border-0"
                  disabled
                  placeholder={placeholder}
                  rows={1}
                />
                <LockedAction
                  feature="aiAssistant"
                  plan={plan}
                  description="You've reached your AI usage limit. Upgrade to Pro to get AI-drafted replies and suggestions for inquiries."
                >
                  <Button
                    aria-label="Send message"
                    className="size-9 shrink-0 rounded-xl"
                    size="icon"
                    type="button"
                  >
                    <SendHorizontal />
                  </Button>
                </LockedAction>
              </div>
            )}
            <p className="mt-1.5 hidden px-1 text-[0.65rem] leading-4 text-muted-foreground sm:block">
              Enter to send. Shift + Enter for a new line.
            </p>
          </div>
          ) : null}
        </>
      )}
    </div>
  );

  if (variant === "fullPage") {
    return <LayoutGroup>{panelContent}</LayoutGroup>;
  }

  return panelContent;
}
