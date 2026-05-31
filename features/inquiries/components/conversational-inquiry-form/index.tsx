"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  PublicInquiryChatExtractedFields,
  PublicInquiryChatStreamEvent,
} from "@/features/inquiries/public-inquiry-chat-schemas";

import type { ChatMessage, ConversationPhase, ConversationalInquiryFormProps } from "./types";
import { createMessageId, getCustomFieldMeta, getChatbotConfig } from "./helpers";
import { loadCachedChat, saveChatToCache, clearChatCache } from "./cache";
import { ChatComposer } from "./chat-composer";
import { MessageRow, ThinkingIndicator } from "./message-row";
import { BrandAvatar } from "./brand-avatar";
import { ConfirmationPanel } from "./confirmation-panel";

// ---------------------------------------------------------------------------
// Conversational Inquiry Form
//
// Chat-style public-facing component that replaces the static form when
// conversational mode is enabled. Streams AI responses from the public
// inquiry chat API and renders a polished chat bubble interface matching
// the dashboard AI assistant style.
// ---------------------------------------------------------------------------

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
