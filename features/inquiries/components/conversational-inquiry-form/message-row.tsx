"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle } from "lucide-react";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { markdownComponents } from "./markdown-components";
import type { ChatMessage } from "./types";

const showDebug = process.env.NODE_ENV === "development";

/* -------------------------------------------------------------------------- */
/*  Thinking indicator (shimmer style from dashboard AI)                       */
/* -------------------------------------------------------------------------- */

export const ThinkingIndicator = memo(function ThinkingIndicator() {
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

export function MessageRow({
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
