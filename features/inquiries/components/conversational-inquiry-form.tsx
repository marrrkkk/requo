"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUp,
  MessageSquarePlus,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Shimmer } from "@/components/ai-elements/shimmer";
import Image from "next/image";
import {
  getInquiryFormFieldInputName,
  inquiryContactMethodLabels,
  type InquiryContactMethod,
} from "@/features/inquiries/form-config";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import type {
  PublicInquiryChatDebugInfo,
  PublicInquiryChatExtractedFields,
  PublicInquiryChatStreamEvent,
} from "@/features/inquiries/public-inquiry-chat-schemas";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Conversational Inquiry Form
//
// Chat-style public-facing component that replaces the static form when
// conversational mode is enabled. Streams AI responses from the public
// inquiry chat API and renders a polished chat bubble interface matching
// the dashboard AI assistant style.
// ---------------------------------------------------------------------------

const showDebug = process.env.NODE_ENV === "development";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  debugInfo?: PublicInquiryChatDebugInfo;
};

type ConversationPhase = "chatting" | "confirming" | "submitting" | "submitted";

type ConversationalInquiryFormProps = {
  business: PublicInquiryBusiness;
  action: (
    state: { error?: string },
    formData: FormData,
  ) => Promise<{ error?: string }>;
};

let messageIdCounter = 0;
function createMessageId() {
  messageIdCounter += 1;
  return `msg_${messageIdCounter}_${Date.now()}`;
}


/* -------------------------------------------------------------------------- */
/*  Markdown components (matching dashboard AI prose style)                    */
/* -------------------------------------------------------------------------- */

const markdownComponents: Components = {
  a({ href, children, ...props }) {
    const isExternal = href ? /^https?:\/\//i.test(href) : false;

    return (
      <a
        {...props}
        href={href}
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

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Build a map of all custom field input names from the form config, with
 * their labels and default empty values.
 */
function getCustomFieldMeta(business: PublicInquiryBusiness) {
  const fields: Array<{
    inputName: string;
    fieldId: string;
    label: string;
    required: boolean;
    fieldType: string;
  }> = [];

  for (const field of business.inquiryFormConfig.projectFields) {
    if (field.kind !== "custom") continue;

    fields.push({
      inputName: getInquiryFormFieldInputName(field),
      fieldId: field.id,
      label: field.label,
      required: field.required,
      fieldType: field.fieldType,
    });
  }

  return fields;
}

/** Derive chatbot display config from the form's conversational mode. */
function getChatbotConfig(business: PublicInquiryBusiness) {
  const conv = business.inquiryFormConfig.conversationalMode;

  return {
    assistantName: conv?.assistantName || `${business.name} Assistant`,
  };
}

/* -------------------------------------------------------------------------- */
/*  Local storage persistence                                                  */
/* -------------------------------------------------------------------------- */

type CachedChatState = {
  messages: ChatMessage[];
  phase: ConversationPhase;
  extractedFields: PublicInquiryChatExtractedFields | null;
  editedFields: PublicInquiryChatExtractedFields | null;
  savedAt: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(business: PublicInquiryBusiness) {
  return `requo:inquiry-chat:v2:${business.slug}:${business.form.slug}`;
}

function loadCachedChat(business: PublicInquiryBusiness): CachedChatState | null {
  try {
    const raw = localStorage.getItem(getCacheKey(business));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedChatState;

    // Expire stale caches
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(business));
      return null;
    }

    // Don't restore if no messages or if already submitted
    if (!parsed.messages?.length || parsed.phase === "submitting") return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveChatToCache(
  business: PublicInquiryBusiness,
  state: Omit<CachedChatState, "savedAt">,
) {
  try {
    const payload: CachedChatState = { ...state, savedAt: Date.now() };
    localStorage.setItem(getCacheKey(business), JSON.stringify(payload));
  } catch {
    // Silently ignore storage errors (quota, private browsing, etc.)
  }
}

function clearChatCache(business: PublicInquiryBusiness) {
  try {
    localStorage.removeItem(getCacheKey(business));
  } catch {
    // Silently ignore
  }
}


/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function ConversationalInquiryForm({
  business,
  action,
}: ConversationalInquiryFormProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Will be properly hydrated in useEffect to avoid SSR mismatch
    return [];
  });
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [phase, setPhase] = useState<ConversationPhase>("chatting");
  const [_extractedFields, setExtractedFields] =
    useState<PublicInquiryChatExtractedFields | null>(null);
  const [editedFields, setEditedFields] =
    useState<PublicInquiryChatExtractedFields | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasHydrated = useRef(false);

  const customFieldMeta = getCustomFieldMeta(business);
  const chatbot = getChatbotConfig(business);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    const cached = loadCachedChat(business);
    if (cached) {
      setMessages(cached.messages);
      setPhase(cached.phase);
      setExtractedFields(cached.extractedFields);
      setEditedFields(cached.editedFields);
    }
  }, [business]);

  // Persist to localStorage whenever messages or phase change
  useEffect(() => {
    if (!hasHydrated.current) return;
    // Only persist if there's something worth saving
    if (messages.length === 0) return;

    saveChatToCache(business, {
      messages,
      phase,
      extractedFields: _extractedFields,
      editedFields,
    });
  }, [messages, phase, _extractedFields, editedFields, business]);

  async function sendToApi(currentMessages: ChatMessage[]) {
    setIsStreaming(true);

    const assistantMessageId = createMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const apiMessages = currentMessages
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch("/api/public/inquiry-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessSlug: business.slug,
          formSlug: business.form.isDefault ? undefined : business.form.slug,
          messages: apiMessages,
        }),
      });

      if (!response.ok || !response.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content:
                    "I'm having trouble connecting right now. Please try again in a moment.",
                  isError: true,
                }
              : m,
          ),
        );
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(
              line.slice(6),
            ) as PublicInquiryChatStreamEvent;

            if (event.type === "delta") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + event.value }
                    : m,
                ),
              );
              scrollToBottom();
            } else if (event.type === "done" && event.extracted) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantMessageId) return m;

                  const cleaned = m.content
                    .replace(/```json:extraction[\s\S]*?```/g, "")
                    .trim();

                  // If the AI called the tool without any text, show a default message
                  const displayContent = cleaned || "I've captured your inquiry details. Please review below.";

                  return { ...m, content: displayContent };
                }),
              );
              setExtractedFields(event.extracted);
              setEditedFields({ ...event.extracted });
              setPhase("confirming");
              scrollToBottom();
            } else if (event.type === "debug") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, debugInfo: event.info }
                    : m,
                ),
              );
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content:
                          m.content ||
                          "I ran into an issue. Please try again.",
                        isError: !m.content,
                      }
                    : m,
                ),
              );
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (error) {
      console.error("[conversational-form] Stream error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content:
                  m.content ||
                  "Something went wrong. Please try again.",
                isError: !m.content,
              }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
      scrollToBottom();
    }
  }

  function handleSend() {
    const trimmed = inputValue.trim();

    if (!trimmed || isStreaming) return;

    runMessage(trimmed);
    setInputValue("");
  }

  function runMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: text.trim(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    scrollToBottom();

    void sendToApi(nextMessages);
  }

  async function handleSubmit() {
    if (!editedFields) return;

    setPhase("submitting");
    setSubmitError(null);
    clearChatCache(business);

    try {
      const formData = new FormData();
      formData.set("customerName", editedFields.customerName);
      formData.set("customerContactMethod", editedFields.customerContactMethod);
      formData.set(
        "customerContactHandle",
        editedFields.customerContactHandle,
      );
      formData.set("serviceCategory", editedFields.serviceCategory);
      formData.set("details", editedFields.details);

      if (editedFields.requestedDeadline) {
        formData.set("requestedDeadline", editedFields.requestedDeadline);
      }
      if (editedFields.budgetText) {
        formData.set("budgetText", editedFields.budgetText);
      }

      const extractedCustom = editedFields.customFields ?? {};

      for (const meta of customFieldMeta) {
        const value = extractedCustom[meta.fieldId];

        if (Array.isArray(value)) {
          for (const v of value) {
            formData.append(meta.inputName, v);
          }
        } else if (typeof value === "boolean") {
          formData.set(meta.inputName, String(value));
        } else if (typeof value === "string") {
          formData.set(meta.inputName, value);
        } else {
          formData.set(meta.inputName, "");
        }
      }

      const result = await action({}, formData);

      if (result?.error) {
        setSubmitError(result.error);
        setPhase("confirming");
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setPhase("confirming");
    }
  }

  function handleEditField(
    field: keyof PublicInquiryChatExtractedFields,
    value: string,
  ) {
    setEditedFields((prev) =>
      prev ? { ...prev, [field]: value } : prev,
    );
  }

  function handleEditCustomField(fieldId: string, value: string) {
    setEditedFields((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        customFields: {
          ...prev.customFields,
          [fieldId]: value,
        },
      };
    });
  }

  function handleReset() {
    setMessages([]);
    setInputValue("");
    setExtractedFields(null);
    setEditedFields(null);
    setPhase("chatting");
    setSubmitError(null);
    clearChatCache(business);
  }

  // Detect streaming with no content yet (for thinking indicator)
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const showThinkingIndicator =
    isStreaming && lastMsg?.role === "assistant" && !lastMsg?.content;

  const hasMessages = messages.length > 0;
  const isInputDisabled = isStreaming || phase !== "chatting";

  return (
    <LayoutGroup>
      <div className="relative flex min-h-[70vh] w-full flex-col">
        {/* Header bar — only visible after messages start */}
        <AnimatePresence>
          {hasMessages && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-center gap-2.5 border-b border-border/50 pb-3"
            >
              <motion.div layoutId="brand-avatar" layout="position" transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}>
                <BrandAvatar business={business} />
              </motion.div>
              <motion.div layoutId="brand-text" layout="position" transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }} className="flex min-w-0 flex-col gap-0">
                <span className="font-heading text-sm font-semibold tracking-tight text-foreground leading-tight">
                  {business.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {business.shortDescription?.trim() || chatbot.assistantName}
                </span>
              </motion.div>
              {!isStreaming && phase === "chatting" && (
                <Button
                  onClick={handleReset}
                  size="sm"
                  variant="ghost"
                  className="ml-auto shrink-0 gap-1.5 text-muted-foreground"
                >
                  <MessageSquarePlus className="size-3.5" />
                  Start over
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Centered initial state — greeting + input + pills */}
        {!hasMessages && (
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <div className="mx-auto w-full max-w-2xl">
              {/* Brand + greeting */}
              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <motion.div layoutId="brand-avatar" layout="position" transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}>
                  <BrandAvatar business={business} />
                </motion.div>
                <motion.div layoutId="brand-text" layout="position" transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }} className="flex flex-col gap-1">
                  <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {business.inquiryPageConfig.brandTagline?.trim() ||
                      `How can ${business.name} help?`}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {business.shortDescription?.trim() || "Describe what you need and we'll take it from there."}
                  </p>
                </motion.div>
              </div>

              {/* Composer */}
              <motion.div layoutId="chat-input" layout="position" transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}>
                <ChatComposer
                  disabled={isInputDisabled}
                  isGenerating={isStreaming}
                  placeholder="Type your message…"
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSend}
                />
              </motion.div>
            </div>
          </div>
        )}

        {/* Messages area — once conversation starts */}
        {hasMessages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            ref={scrollContainerRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4 ai-chat-scrollbar"
          >
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
              {messages.map((msg, index) => {
                const isLastAssistant =
                  msg.role === "assistant" &&
                  index === messages.length - 1;
                return (
                  <MessageRow
                    key={msg.id}
                    message={msg}
                    isLastAssistant={isLastAssistant}
                    isStreaming={isStreaming}
                  />
                );
              })}

              {showThinkingIndicator ? <ThinkingIndicator /> : null}

              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}

        {/* Input area — pinned at bottom once conversation starts */}
        {hasMessages && (
          <div className="mx-auto w-full max-w-2xl border-t border-border/50 pt-3">
            {phase === "confirming" && editedFields ? (
              <ConfirmationPanel
                fields={editedFields}
                business={business}
                customFieldMeta={customFieldMeta}
                submitError={submitError}
                onEdit={handleEditField}
                onEditCustomField={handleEditCustomField}
                onSubmit={handleSubmit}
                onBack={() => setPhase("chatting")}
              />
            ) : phase === "submitting" ? (
              <div className="flex items-center justify-center gap-2 py-6">
                <Spinner aria-hidden="true" />
                <span className="text-sm text-muted-foreground">
                  Submitting your inquiry…
                </span>
              </div>
            ) : (
              <>
                <motion.div layoutId="chat-input" layout="position" transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}>
                  <ChatComposer
                    disabled={isInputDisabled}
                    isGenerating={isStreaming}
                    placeholder="Type your message…"
                    value={inputValue}
                    onChange={setInputValue}
                    onSubmit={handleSend}
                  />
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}


/* -------------------------------------------------------------------------- */
/*  Composer (matching dashboard AI ChatInput pattern)                         */
/* -------------------------------------------------------------------------- */

function ChatComposer({
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
  isGenerating?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
        maxLength={2000}
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

/* -------------------------------------------------------------------------- */
/*  Thinking indicator (shimmer style from dashboard AI)                       */
/* -------------------------------------------------------------------------- */

const ThinkingIndicator = memo(function ThinkingIndicator() {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center py-1">
        <Shimmer duration={1.5} className="text-sm font-medium">
          Thinking
        </Shimmer>
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Streaming cursor                                                           */
/* -------------------------------------------------------------------------- */

const StreamingCursor = memo(function StreamingCursor() {
  return (
    <span
      aria-hidden="true"
      className="ai-stream-cursor inline-block h-[1.1em] w-[2px] translate-y-[0.15em] rounded-full bg-primary/80 align-middle"
    />
  );
});

/* -------------------------------------------------------------------------- */
/*  Message row                                                                */
/* -------------------------------------------------------------------------- */

function MessageRow({
  message,
  isLastAssistant,
  isStreaming,
}: {
  message: ChatMessage;
  isLastAssistant?: boolean;
  isStreaming?: boolean;
}) {
  if (message.role === "user") {
    return <UserBubble message={message} />;
  }

  return (
    <AssistantBubble
      message={message}
      isActivelyStreaming={isLastAssistant && isStreaming}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  User bubble (matching dashboard style)                                     */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Assistant bubble (with markdown rendering like dashboard AI)               */
/* -------------------------------------------------------------------------- */

const AssistantBubble = memo(function AssistantBubble({
  message,
  isActivelyStreaming,
}: {
  message: ChatMessage;
  isActivelyStreaming?: boolean;
}) {
  const hasContent = message.content.trim().length > 0;

  if (message.isError) {
    return (
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
          <span>{message.content || "Could not complete that request."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      {hasContent ? (
        <div className="ai-prose text-sm leading-7 text-foreground">
          <ReactMarkdown
            components={markdownComponents}
            remarkPlugins={[remarkGfm]}
          >
            {message.content}
          </ReactMarkdown>
          {isActivelyStreaming ? <StreamingCursor /> : null}
        </div>
      ) : null}

      {showDebug && message.debugInfo ? (
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
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Brand avatar (business logo for the AI header)                             */
/* -------------------------------------------------------------------------- */

function BrandAvatar({ business }: { business: PublicInquiryBusiness }) {
  if (business.logoUrl) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background/92 shadow-sm sm:size-11">
        <Image
          src={business.logoUrl}
          alt={`${business.name} logo`}
          width={44}
          height={44}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  const initials = business.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-primary/10 text-primary sm:size-11">
      <span className="text-xs font-semibold tracking-wide">{initials}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confirmation panel                                                         */
/* -------------------------------------------------------------------------- */

type CustomFieldMetaItem = {
  inputName: string;
  fieldId: string;
  label: string;
  required: boolean;
  fieldType: string;
};

function ConfirmationPanel({
  fields,
  business,
  customFieldMeta,
  submitError,
  onEdit,
  onEditCustomField,
  onSubmit,
  onBack,
}: {
  fields: PublicInquiryChatExtractedFields;
  business: PublicInquiryBusiness;
  customFieldMeta: CustomFieldMetaItem[];
  submitError: string | null;
  onEdit: (
    field: keyof PublicInquiryChatExtractedFields,
    value: string,
  ) => void;
  onEditCustomField: (fieldId: string, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const contactMethodLabel =
    inquiryContactMethodLabels[
      fields.customerContactMethod as InquiryContactMethod
    ] ?? fields.customerContactMethod;

  return (
    <div className="flex flex-col gap-4 border-t border-border/50 px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
          Review your inquiry
        </h3>
        <p className="text-sm text-muted-foreground">
          Confirm the details below before submitting to {business.name}.
        </p>
      </div>

      <div className="grid gap-3">
        <ConfirmationField
          label="Name"
          value={fields.customerName}
          onChange={(v) => onEdit("customerName", v)}
        />
        <ConfirmationField
          label={`Contact (${contactMethodLabel})`}
          value={fields.customerContactHandle}
          onChange={(v) => onEdit("customerContactHandle", v)}
        />
        <ConfirmationField
          label="Service needed"
          value={fields.serviceCategory}
          onChange={(v) => onEdit("serviceCategory", v)}
        />
        <ConfirmationField
          label="Details"
          value={fields.details}
          onChange={(v) => onEdit("details", v)}
          multiline
        />
        {fields.budgetText ? (
          <ConfirmationField
            label="Budget"
            value={fields.budgetText}
            onChange={(v) => onEdit("budgetText", v)}
          />
        ) : null}
        {fields.requestedDeadline ? (
          <ConfirmationField
            label="Deadline"
            value={fields.requestedDeadline}
            onChange={(v) => onEdit("requestedDeadline", v)}
          />
        ) : null}

        {/* Custom fields from the form config */}
        {customFieldMeta.map((meta) => {
          const extractedValue = fields.customFields?.[meta.fieldId];
          const displayValue =
            typeof extractedValue === "string"
              ? extractedValue
              : Array.isArray(extractedValue)
                ? extractedValue.join(", ")
                : typeof extractedValue === "boolean"
                  ? extractedValue
                    ? "Yes"
                    : "No"
                  : "";

          if (!displayValue && !meta.required) return null;

          return (
            <ConfirmationField
              key={meta.fieldId}
              label={`${meta.label}${meta.required ? "" : " (optional)"}`}
              value={displayValue}
              onChange={(v) => onEditCustomField(meta.fieldId, v)}
              missing={!displayValue && meta.required}
            />
          );
        })}
      </div>

      {submitError ? (
        <p className="text-sm text-destructive">{submitError}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back to chat
        </Button>
        <Button onClick={onSubmit} size="default">
          <Send className="mr-1.5 size-3.5" />
          Submit inquiry
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confirmation field                                                         */
/* -------------------------------------------------------------------------- */

function ConfirmationField({
  label,
  value,
  onChange,
  multiline = false,
  missing = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  missing?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false || missing);
  const [editValue, setEditValue] = useState(value);

  function handleSave() {
    onChange(editValue.trim());
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className={cn(
          "text-xs font-medium",
          missing ? "text-destructive" : "text-muted-foreground",
        )}>
          {label}
          {missing ? " — required" : ""}
        </span>
        {multiline ? (
          <textarea
            className="control-surface min-h-[5rem] w-full resize-y rounded-lg border border-input/95 px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-4 focus:ring-ring/15"
            onChange={(e) => setEditValue(e.target.value)}
            value={editValue}
          />
        ) : (
          <Input
            autoFocus
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            value={editValue}
          />
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={handleSave}>
            Save
          </Button>
          {!missing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditValue(value);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-sm text-foreground">
          {multiline ? (
            <span className="line-clamp-3 whitespace-pre-line">{value}</span>
          ) : (
            value
          )}
        </span>
      </div>
      <button
        className="shrink-0 text-xs text-primary hover:underline"
        onClick={() => setIsEditing(true)}
        type="button"
      >
        Edit
      </button>
    </div>
  );
}
