"use client";

import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { Markdown } from "@/components/prompt-kit/markdown";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import {
  Steps,
  StepsTrigger,
  StepsContent,
  StepsItem,
} from "@/components/prompt-kit/steps";
import { StructuredDataCard, type StructuredToolOutput } from "./chat-data-cards";
import { AiActionButton, type AiActionProposal } from "@/features/ai/components/ai-action-button";
import { DevMessageDebug } from "./dev-debug-panel";
import { Button } from "@/components/ui/button";
import { Copy, Check, RotateCcw, Search, Database } from "lucide-react";
import { useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessageStep = {
  id: string;
  name: string;
  label: string;
  state: "running" | "completed";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  pending?: boolean;
  steps?: ChatMessageStep[];
  structuredData?: StructuredToolOutput[];
  actionProposals?: AiActionProposal[];
};

// ---------------------------------------------------------------------------
// Single message bubble
// ---------------------------------------------------------------------------

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-foreground/10 px-4 py-2.5 text-sm text-foreground">
          <Markdown className="ai-prose">{message.content}</Markdown>
        </div>
      </div>
    );
  }

  // Assistant message — no avatar, just content
  return (
    <div className="group/message">
      {message.pending && !message.content ? (
        message.steps && message.steps.length > 0 ? (
          <ChatSteps steps={message.steps} />
        ) : (
          <TextShimmer className="text-sm">
            Thinking...
          </TextShimmer>
        )
      ) : (
        <div className="space-y-1.5">
          {message.steps && message.steps.length > 0 && (
            <ChatSteps steps={message.steps} />
          )}
          <div
            className={cn(
              "ai-prose max-w-none break-words text-foreground",
              message.pending && "ai-streaming",
              message.isError &&
                "rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive not-prose",
            )}
          >
            {message.isError ? (
              message.content
            ) : (
              <Markdown>{message.content}</Markdown>
            )}
          </div>

          {!message.pending && message.structuredData && message.structuredData.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.structuredData.map((data, i) => (
                <StructuredDataCard key={i} output={data} />
              ))}
            </div>
          )}

          {!message.pending && message.actionProposals && message.actionProposals.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.actionProposals.map((proposal, i) => (
                <AiActionButton key={i} proposal={proposal} />
              ))}
            </div>
          )}

          {!message.pending && message.content && !message.isError && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCopy}
                aria-label="Copy message"
              >
                {copied ? (
                  <Check className="size-3" />
                ) : (
                  <Copy className="size-3" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool call steps display
// ---------------------------------------------------------------------------

const TOOL_LABELS: Record<string, string> = {
  count_inquiries: "Counting inquiries",
  count_quotes: "Counting quotes",
  search_inquiries: "Searching inquiries",
  search_quotes: "Searching quotes",
  get_inquiry_details: "Loading inquiry details",
  get_quote_details: "Loading quote details",
  get_business_stats: "Fetching business stats",
  get_recent_activity: "Checking recent activity",
  get_follow_ups: "Loading follow-ups",
  list_inquiries: "Listing inquiries",
  list_quotes: "Listing quotes",
  get_analytics_overview: "Analyzing business data",
  get_revenue_summary: "Calculating revenue",
  get_stale_inquiries: "Finding stale inquiries",
  get_expiring_quotes: "Checking expiring quotes",
  get_customer_history: "Looking up customer history",
  get_service_categories: "Loading service categories",
  get_pricing_library: "Checking pricing library",
  get_inquiry_notes: "Reading inquiry notes",
  get_inquiry_conversation: "Loading conversation",
  get_inquiry_attachments: "Checking attachments",
  get_job_pipeline: "Loading job pipeline",
  get_response_times: "Analyzing response times",
  get_period_comparison: "Comparing periods",
  get_business_knowledge: "Searching knowledge base",
  get_quote_customer_response: "Loading customer response",
  get_business_info: "Loading business profile",
  get_business_members: "Loading team members",
  draft_inquiry: "Drafting inquiry",
  draft_quote: "Drafting quote",
  schedule_follow_up: "Scheduling follow-up",
  update_inquiry_status: "Updating inquiry status",
};

function getToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, " ");
}

function getToolIcon(name: string) {
  if (name.startsWith("search") || name.startsWith("get_customer")) {
    return <Search className="size-3.5" />;
  }
  return <Database className="size-3.5" />;
}

function ChatSteps({ steps }: { steps: ChatMessageStep[] }) {
  const allCompleted = steps.every((s) => s.state === "completed");
  const lastStep = steps[steps.length - 1];
  const activeLabel = lastStep ? getToolLabel(lastStep.name) : "Working...";
  const label = allCompleted
    ? `Used ${steps.length} ${steps.length === 1 ? "source" : "sources"}`
    : activeLabel;

  return (
    <Steps defaultOpen={!allCompleted}>
      <StepsTrigger
        leftIcon={getToolIcon(steps[0]?.name ?? "")}
        className="mb-2"
      >
        {allCompleted ? (
          label
        ) : (
          <TextShimmer className="text-sm">
            {label}
          </TextShimmer>
        )}
      </StepsTrigger>
      <StepsContent>
        {steps.map((step) => (
          <StepsItem key={step.id}>
            <span className="flex items-center gap-2">
              {step.state === "running" ? (
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              ) : (
                <span className="size-1.5 rounded-full bg-muted-foreground/50" />
              )}
              {getToolLabel(step.name)}
            </span>
          </StepsItem>
        ))}
      </StepsContent>
    </Steps>
  );
}

// ---------------------------------------------------------------------------
// Message list
// ---------------------------------------------------------------------------

export type ChatMessageListProps = {
  messages: ChatMessage[];
  rawMessages?: UIMessage[];
  userName: string;
  isPending?: boolean;
  onRetry?: () => void;
  error?: string | null;
};

export function ChatMessageList({
  messages,
  rawMessages,
  isPending,
  onRetry,
}: ChatMessageListProps) {
  const hasError = messages.some((m) => m.isError);

  return (
    <div className="flex flex-col gap-6">
      {messages.map((message) => {
        const rawMsg = rawMessages?.find((rm) => rm.id === message.id);
        return (
          <div key={message.id}>
            <ChatMessageBubble message={message} />
            {rawMsg && <DevMessageDebug message={rawMsg} />}
          </div>
        );
      })}

      {isPending && !messages.some((m) => m.pending) && (
        <TextShimmer className="text-sm">
          Thinking...
        </TextShimmer>
      )}

      {hasError && onRetry && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="size-3.5" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
