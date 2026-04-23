"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Check,
  Copy,
  FileText,
  ListChecks,
  Mail,
  ReceiptText,
  SendHorizontal,
  Wand2,
  X,
} from "lucide-react";

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  aiAssistantTruncationMessage,
  type AiAssistantIntent,
  type AiAssistantStreamEvent,
} from "@/features/ai/types";
import { cn } from "@/lib/utils";

type InquiryAiPanelProps = {
  inquiryId: string;
  userName: string;
};

type CopyState = "idle" | "copied" | "error";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  label: string;
  content: string;
  title?: string;
  model?: string;
  pending?: boolean;
  isError?: boolean;
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
  AiAssistantStreamEvent,
  { type: "done" | "error" }
>;

const presetActions: Array<{
  intent: Exclude<AiAssistantIntent, "custom">;
  label: string;
  description: string;
  icon: typeof Mail;
  userMessage: string;
}> = [
  {
    intent: "draft-first-reply",
    label: "Draft first reply",
    description: "Customer-ready first response with clear next steps.",
    icon: Mail,
    userMessage: "Draft the first reply for this inquiry.",
  },
  {
    intent: "summarize-inquiry",
    label: "Summarize inquiry",
    description: "Short owner-facing brief with the main risks and next move.",
    icon: FileText,
    userMessage: "Summarize this inquiry and tell me what matters most.",
  },
  {
    intent: "suggest-follow-up-questions",
    label: "Suggest questions",
    description: "Clarifying questions that unblock scope, timing, and quoting.",
    icon: ListChecks,
    userMessage: "Suggest the follow-up questions I should ask for this inquiry.",
  },
  {
    intent: "suggest-quote-line-items",
    label: "Suggest line items",
    description: "Quote structure ideas without inventing prices.",
    icon: ReceiptText,
    userMessage: "Suggest quote line items for this inquiry without pricing them.",
  },
  {
    intent: "rewrite-draft",
    label: "Rewrite draft",
    description: "Paste rough text in the message box, then polish it.",
    icon: Wand2,
    userMessage: "Rewrite this draft into a clearer, more professional reply.",
  },
  {
    intent: "generate-follow-up-message",
    label: "Generate follow-up",
    description: "Concise check-in for an inquiry that still needs a reply.",
    icon: SendHorizontal,
    userMessage: "Generate a follow-up message for this inquiry.",
  },
];

function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function truncateMessagePreview(value: string, limit = 420) {
  const trimmedValue = value.trim();

  if (trimmedValue.length <= limit) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, limit).trimEnd()}...`;
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
    setState({
      messageId,
      state: "copied",
    });
  } catch {
    setState({
      messageId,
      state: "error",
    });
  }
}

function buildUserMessage(intent: AiAssistantIntent, composerValue: string) {
  const preset = presetActions.find((action) => action.intent === intent);

  if (intent === "custom") {
    return truncateMessagePreview(composerValue, 600);
  }

  if (intent === "rewrite-draft") {
    return `${preset?.userMessage ?? "Rewrite this draft."}\n\n${truncateMessagePreview(
      composerValue,
      520,
    )}`;
  }

  return preset?.userMessage ?? "Run the selected AI request.";
}

function validateIntent(intent: AiAssistantIntent, composerValue: string) {
  const trimmedValue = composerValue.trim();

  if (intent === "custom") {
    if (!trimmedValue) {
      return "Type a question before sending it to the assistant.";
    }

    if (trimmedValue.length > 1200) {
      return "Custom requests must be 1,200 characters or less.";
    }
  }

  if (intent === "rewrite-draft") {
    if (!trimmedValue) {
      return "Paste a draft into the message box, then click Rewrite draft.";
    }

    if (composerValue.length > 6000) {
      return "Drafts for rewrite must be 6,000 characters or less.";
    }
  }

  return null;
}

function buildRequestPayload(intent: AiAssistantIntent, composerValue: string) {
  return {
    intent,
    customPrompt: intent === "custom" ? composerValue.trim() : undefined,
    sourceDraft: intent === "rewrite-draft" ? composerValue : undefined,
  };
}

async function getStreamErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };

    if (payload.error) {
      return payload.error;
    }
  } catch {
    // Fall through to a generic message.
  }

  return "The assistant could not generate an answer right now. Try again in a moment.";
}

function parseStreamEvent(line: string) {
  const parsed = JSON.parse(line) as AiAssistantStreamEvent;

  if (
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

  if (!dataLines.length) {
    return null;
  }

  return parseStreamEvent(dataLines.join("\n"));
}

function splitTextIntoSegments(value: string) {
  return value.match(/\S+\s*|\s+/g) ?? [value];
}

async function consumeStream(
  response: Response,
  onEvent: (event: AiAssistantStreamEvent) => void,
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
              : "Requo AI"}
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
              Thinking through the inquiry...
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {!isUser && (message.title || message.model) ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    {message.title ? (
                      <h3 className="font-heading text-base font-semibold text-foreground">
                        {message.title}
                      </h3>
                    ) : null}
                  </div>

                  {message.model ? (
                    <span className="rounded-md border border-border/80 bg-secondary px-3 py-1 text-xs text-muted-foreground">
                      {message.model}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <p
                className={cn(
                  "whitespace-pre-wrap text-sm leading-7",
                  isUser
                    ? "text-primary-foreground"
                    : message.isError
                      ? "text-destructive"
                      : "text-foreground",
                )}
              >
                {message.content}
              </p>

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

export function InquiryAiPanel({ inquiryId, userName }: InquiryAiPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [composerValue, setComposerValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copyState, setCopyState] = useTimedCopyState();
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({
      block: "end",
    });
  }, [isOpen, messages, isPending]);

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
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createMessageId(),
        role: "assistant",
        label: isError ? "Requo AI error" : "Requo AI",
        content,
        isError,
        title: isError ? "Check that request" : undefined,
      },
    ]);
  }

  async function runIntent(intent: AiAssistantIntent) {
    if (isPending) {
      return;
    }

    const composerSnapshot = composerValue;
    const validationMessage = validateIntent(intent, composerSnapshot);

    if (validationMessage) {
      appendAssistantNote(validationMessage, intent === "custom");
      return;
    }

    const assistantMessageId = createMessageId();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createMessageId(),
        role: "user",
        label: userName,
        content: buildUserMessage(intent, composerSnapshot),
      },
      {
        id: assistantMessageId,
        role: "assistant",
        label: "Requo AI",
        content: "",
        pending: true,
      },
    ]);
    setIsPending(true);

    if (intent === "custom" || intent === "rewrite-draft") {
      setComposerValue("");
    }

    const queuedSegments: string[] = [];
    let flushTimerId: number | null = null;
    let providerFinished = false;
    let terminalEvent: AssistantTerminalEvent | null = null;
    let renderedContent = "";
    let resolveQueueDrained: (() => void) | null = null;
    const queueDrained = new Promise<void>((resolve) => {
      resolveQueueDrained = resolve;
    });

    function maybeResolveQueueDrained() {
      if (!providerFinished || queuedSegments.length || flushTimerId !== null) {
        return;
      }

      resolveQueueDrained?.();
      resolveQueueDrained = null;
    }

    function stopFlushTimer() {
      if (flushTimerId !== null) {
        window.clearInterval(flushTimerId);
        flushTimerId = null;
      }

      maybeResolveQueueDrained();
    }

    function flushQueuedSegments() {
      if (!queuedSegments.length) {
        stopFlushTimer();
        return;
      }

      const segmentCount = queuedSegments.length > 40 ? 3 : 1;
      const nextChunk = queuedSegments.splice(0, segmentCount).join("");

      renderedContent += nextChunk;

      updateMessage(assistantMessageId, (message) => ({
        ...message,
        content: `${message.content}${nextChunk}`,
      }));

      if (!queuedSegments.length) {
        stopFlushTimer();
      }
    }

    function ensureFlushTimer() {
      if (flushTimerId !== null) {
        return;
      }

      flushTimerId = window.setInterval(() => {
        flushQueuedSegments();
      }, 20);
    }

    function queueAssistantDelta(value: string) {
      const segments = splitTextIntoSegments(value);

      if (!segments.length) {
        return;
      }

      queuedSegments.push(...segments);
      ensureFlushTimer();
    }

    function markProviderFinished(nextTerminalEvent?: AssistantTerminalEvent) {
      providerFinished = true;

      if (nextTerminalEvent) {
        terminalEvent = nextTerminalEvent;
      }

      if (!queuedSegments.length) {
        stopFlushTimer();
      }
    }

    async function waitForQueueToDrain() {
      providerFinished = true;

      if (!queuedSegments.length) {
        stopFlushTimer();
        return;
      }

      ensureFlushTimer();
      await queueDrained;
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
          title: hasContent ? message.title : "Could not complete that request",
          statusNote: event.truncated
            ? {
                content: aiAssistantTruncationMessage,
                tone: "muted",
              }
            : undefined,
        }));

        return;
      }

      updateMessage(assistantMessageId, (message) => ({
        ...message,
        pending: false,
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
      const response = await fetch(`/api/business/inquiries/${inquiryId}/ai`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(buildRequestPayload(intent, composerSnapshot)),
      });

      if (!response.ok) {
        const errorMessage = await getStreamErrorMessage(response);

        updateMessage(assistantMessageId, (message) => ({
          ...message,
          content: errorMessage,
          isError: true,
          pending: false,
          title: "Could not complete that request",
        }));
        return;
      }

      await consumeStream(response, (event) => {
        switch (event.type) {
          case "meta":
            updateMessage(assistantMessageId, (message) => ({
              ...message,
              title: event.title,
              model: event.model,
            }));
            break;
          case "delta":
            queueAssistantDelta(event.value);
            break;
          case "done":
            markProviderFinished(event);
            break;
          case "error":
            markProviderFinished(event);
            break;
        }
      });

      await waitForQueueToDrain();

      if (terminalEvent) {
        finalizeTerminalEvent(terminalEvent);
      } else {
        const hasContent = renderedContent.trim().length > 0;

        updateMessage(assistantMessageId, (message) => ({
          ...message,
          pending: false,
          isError: !hasContent,
          content: hasContent
            ? message.content
            : "The stream ended unexpectedly. Try again if you need a fresh reply.",
          title: hasContent ? message.title : "Could not complete that request",
          statusNote: hasContent
            ? {
                content:
                  "The stream ended unexpectedly. Try again if you need a fresh reply.",
                tone: "error",
              }
            : undefined,
        }));
      }
    } catch (error) {
      markProviderFinished();
      await waitForQueueToDrain();

      console.error("Failed to stream inquiry AI request.", error);

      updateMessage(assistantMessageId, (message) => {
        const hasContent = renderedContent.trim().length > 0;

        return {
          ...message,
          content: hasContent
            ? message.content
            : "The assistant could not respond right now. Try again in a moment.",
          isError: !hasContent,
          pending: false,
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
    }
  }

  function handleCustomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runIntent("custom");
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void runIntent("custom");
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label={isOpen ? "Close Requo AI" : "Open Requo AI"}
            className="size-14 rounded-full border-border/70 bg-[var(--surface-elevated-bg)] p-0 shadow-[var(--surface-shadow-lg)]"
            data-testid="inquiry-ai-launcher"
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
              {isOpen ? "Close Requo AI" : "Open Requo AI"}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="overlay-surface h-[calc(100vh-12rem)] w-[min(calc(100vw-1rem),27rem)] gap-0 overflow-hidden rounded-[1.5rem] border p-0 text-foreground"
          collisionPadding={8}
          data-testid="inquiry-ai-dialog"
          onOpenAutoFocus={(event) => event.preventDefault()}
          side="top"
          sideOffset={18}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="surface-card-footer flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 object-contain"
                />
                <h2 className="font-heading text-base font-semibold text-primary">
                  Requo AI
                </h2>
              </div>

              <Button
                aria-label="Close Requo AI"
                onClick={() => setIsOpen(false)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X />
                <span className="sr-only">Close assistant</span>
              </Button>
            </div>

            <div className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="flex min-h-full flex-col gap-4 px-4 py-4">
                  {messages.length ? (
                    messages.map((message) => (
                      <TranscriptMessage
                        copyState={copyState}
                        key={message.id}
                        message={message}
                        onCopy={(targetMessage) =>
                          copyText(targetMessage.content, targetMessage.id, setCopyState)
                        }
                      />
                    ))
                  ) : (
                    <div className="flex min-h-[17rem] flex-col justify-end gap-6">
                      <div className="flex w-full justify-end">
                        <div className="flex max-w-[92%] flex-col items-end gap-2">
                          {presetActions.map((preset) => {
                            return (
                              <button
                                className="rounded-[1.25rem] border border-primary/40 bg-background px-4 py-2.5 text-sm text-primary shadow-sm transition-colors hover:bg-primary/5 disabled:opacity-50"
                                disabled={isPending}
                                key={preset.intent}
                                onClick={() => {
                                  void runIntent(preset.intent);
                                }}
                                title={preset.description}
                                type="button"
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={transcriptEndRef} />
                </div>
              </ScrollArea>
            </div>

            <div className="border-t border-border/70 px-3 py-3">
              <form className="relative" onSubmit={handleCustomSubmit}>
                <Textarea
                  className="min-h-[2.75rem] max-h-[6rem] resize-none py-2.5 pr-12 shadow-[var(--control-shadow)]"
                  disabled={isPending}
                  maxLength={6000}
                  onChange={(event) => setComposerValue(event.currentTarget.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Ask about this inquiry, or paste rough text to rewrite..."
                  rows={1}
                  value={composerValue}
                />

                <div className="absolute bottom-1 right-1">
                  <Button
                    className="size-9 rounded-[0.45rem]"
                    disabled={isPending || !composerValue.trim()}
                    size="icon"
                    type="submit"
                  >
                    {isPending ? (
                      <Spinner aria-hidden="true" />
                    ) : (
                      <SendHorizontal />
                    )}
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
              </form>
            </div>

          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
