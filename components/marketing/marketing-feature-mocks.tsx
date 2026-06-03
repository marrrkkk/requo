"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Calendar,
  Check,
  CircleDot,
  Clock3,
  Eye,
  FileText,
  History,
  Plus,
  Send,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { LandingFeatureId } from "@/components/marketing/marketing-data";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { WorkflowToolbar } from "@/features/automations/components/builder/panels/workflow-toolbar";
import {
  ChatMessageList,
  type ChatMessage,
} from "@/features/ai/chat-ui/chat-message-list";
import { aiQuickActions, getPanelPlaceholder } from "@/features/ai/components/ai-chat-helpers";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

export function MarketingFeatureMock({
  featureId,
}: {
  featureId: LandingFeatureId;
}) {
  if (featureId === "inquiries") return <InquiriesPreviewMock />;
  if (featureId === "quotes") return <QuotePreviewMock />;
  if (featureId === "ai") return <AIChatPreviewMock />;
  if (featureId === "automations") return <AutomationPreviewMock />;
  if (featureId === "analytics") return <AnalyticsPreviewMock />;
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                  Inquiries                                 */
/* -------------------------------------------------------------------------- */

type InquiryStatusKey = "all" | "new" | "quoted" | "waiting" | "won";

type InquiryRow = {
  id: string;
  customer: string;
  email: string;
  form: string;
  service: string;
  status: Exclude<InquiryStatusKey, "all">;
  submittedAt: string;
};

const inquiryRows: readonly InquiryRow[] = [
  {
    id: "inq-1",
    customer: "Sarah Jenkins",
    email: "sarah@jenkins.co",
    form: "Kitchen remodel",
    service: "Full remodel",
    status: "new",
    submittedAt: "Today, 10:24 AM",
  },
  {
    id: "inq-2",
    customer: "Leo Park",
    email: "leo.p@northhaus.com",
    form: "Repair request",
    service: "Tile repair",
    status: "quoted",
    submittedAt: "Today, 9:02 AM",
  },
  {
    id: "inq-3",
    customer: "Maya Fields",
    email: "maya@fieldsstudio.com",
    form: "Studio fit-out",
    service: "Cabinetry",
    status: "waiting",
    submittedAt: "Yesterday",
  },
  {
    id: "inq-4",
    customer: "Ana Cruz",
    email: "ana.cruz@everhome.co",
    form: "Kitchen remodel",
    service: "Countertop",
    status: "won",
    submittedAt: "2 days ago",
  },
  {
    id: "inq-5",
    customer: "Jordan Kim",
    email: "jkim@hatchstudio.io",
    form: "Custom build",
    service: "Built-in shelving",
    status: "new",
    submittedAt: "3 days ago",
  },
] as const;

const inquiryStatusMeta: Record<
  Exclude<InquiryStatusKey, "all">,
  { label: string; icon: LucideIcon }
> = {
  new: { label: "New", icon: CircleDot },
  quoted: { label: "Quoted", icon: FileText },
  waiting: { label: "Waiting", icon: Clock3 },
  won: { label: "Won", icon: Trophy },
};

function InquiryStatusPill({
  status,
}: {
  status: Exclude<InquiryStatusKey, "all">;
}) {
  const meta = inquiryStatusMeta[status];
  const Icon = meta.icon;
  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        status === "won" && "border-primary/40 bg-primary/12 text-primary",
      )}
      variant={status === "won" ? "default" : "secondary"}
    >
      <Icon data-icon="inline-start" />
      {meta.label}
    </Badge>
  );
}

function InquiriesPreviewMock() {
  const [status, setStatus] = useState<InquiryStatusKey>("all");
  const [selected, setSelected] = useState<string>(inquiryRows[0].id);

  const visibleRows = useMemo(() => {
    if (status === "all") return inquiryRows;
    return inquiryRows.filter((row) => row.status === status);
  }, [status]);

  const counts = useMemo(() => {
    const base: Record<InquiryStatusKey, number> = {
      all: inquiryRows.length,
      new: 0,
      quoted: 0,
      waiting: 0,
      won: 0,
    };
    for (const row of inquiryRows) {
      base[row.status] += 1;
    }
    return base;
  }, []);

  const filters: readonly { key: InquiryStatusKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "quoted", label: "Quoted" },
    { key: "waiting", label: "Waiting" },
    { key: "won", label: "Won" },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto pr-1">
      <div className="grid gap-3">
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
        {filters.map((filter) => {
          const active = filter.key === status;
          return (
            <button
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs",
                active
                  ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                  : "border-border/70 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground",
              )}
              key={filter.key}
              onClick={() => setStatus(filter.key)}
              type="button"
            >
              {filter.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:text-[10px]",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/50 text-muted-foreground",
                )}
              >
                {counts[filter.key]}
              </span>
            </button>
          );
        })}
        </div>

      <div className="overflow-hidden rounded-xl border border-border/75 bg-background/95 shadow-[var(--surface-shadow-sm)]">
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2 border-b border-border/70 bg-muted/25 px-3 py-2 text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-4 sm:text-[0.64rem] sm:tracking-[0.14em]">
          <span>Customer</span>
          <span>Status</span>
          <span className="hidden sm:block">Submitted</span>
        </div>

        <div className="divide-y divide-border/70">
          {visibleRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              No inquiries match this filter.
            </div>
          ) : (
            visibleRows.map((row) => (
              <button
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_5.5rem] cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-4 sm:py-3",
                  selected === row.id ? "bg-accent/60" : "hover:bg-muted/30",
                )}
                key={row.id}
                onClick={() => setSelected(row.id)}
                type="button"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                    {row.customer}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
                    {row.form}
                  </p>
                </div>
                <div className="min-w-0">
                  <InquiryStatusPill status={row.status} />
                </div>
                <span className="hidden truncate text-[10px] text-muted-foreground sm:block sm:text-xs">
                  {row.submittedAt}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Quotes                                   */
/* -------------------------------------------------------------------------- */

type QuoteLineItem = {
  id: string;
  desc: string;
  qty: string;
  priceInCents: number;
  isAiGenerated?: boolean;
};

const quoteGenerationItems: readonly Omit<QuoteLineItem, "id">[] = [
  { desc: "Custom cabinets & hardware", qty: "1", priceInCents: 240000 },
  { desc: "Countertop installation", qty: "1", priceInCents: 120000 },
  { desc: "Labor & demo", qty: "40h", priceInCents: 65000 },
];

function formatMoney(cents: number) {
  const value = cents / 100;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function QuotePreviewMock() {
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const generationTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      for (const timeout of generationTimeouts.current) {
        clearTimeout(timeout);
      }
    };
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.priceInCents, 0);

  const generateWithAi = useCallback(() => {
    if (isAiGenerating) return;

    for (const timeout of generationTimeouts.current) {
      clearTimeout(timeout);
    }
    generationTimeouts.current = [];

    setHasGenerated(false);
    setItems([]);
    setIsAiGenerating(true);

    quoteGenerationItems.forEach((item, index) => {
      const timeout = setTimeout(() => {
        setItems((current) => [
          ...current,
          {
            ...item,
            id: `item-${index + 1}`,
            isAiGenerated: true,
          },
        ]);

        if (index === quoteGenerationItems.length - 1) {
          setIsAiGenerating(false);
          setHasGenerated(true);
        }
      }, 650 * (index + 1));

      generationTimeouts.current.push(timeout);
    });
  }, [isAiGenerating]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
        <div className="min-w-0">
          <p className="meta-label">Quote</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            Kitchen Remodel
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            Sarah Jenkins · 123 Main St
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium text-foreground">Q-1042</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Valid 30 days</p>
        </div>
      </div>

      <div
        className={cn(
          "mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/75 bg-background/95 shadow-[var(--surface-shadow-sm)]",
          isAiGenerating && "ai-glow-section",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2.5 sm:px-4">
          <div>
            <p className="text-xs font-medium text-foreground">Line items</p>
            <p className="text-[10px] text-muted-foreground">
              Add priced rows. Totals update while you edit.
            </p>
          </div>
          <Button
            className="h-7 shrink-0 px-2.5 text-[11px] sm:h-8 sm:px-3 sm:text-xs"
            disabled={isAiGenerating}
            onClick={generateWithAi}
            size="sm"
            type="button"
          >
            {isAiGenerating ? (
              <>
                <Spinner aria-hidden="true" data-icon="inline-start" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles data-icon="inline-start" />
                Generate with AI
              </>
            )}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {items.length === 0 && !isAiGenerating ? (
            <div className="flex h-full min-h-[9rem] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 text-center">
              <Sparkles className="size-4 text-primary" />
              <p className="mt-2 text-xs font-medium text-foreground">
                Draft line items from the inquiry
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                AI matches your pricing library and past quotes.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {items.map((row, index) => (
                <div
                  className={cn(
                    "soft-panel relative overflow-hidden rounded-xl p-3",
                    row.isAiGenerated && "ai-glow-border",
                  )}
                  key={row.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-foreground">
                      Item {index + 1}
                    </p>
                    {row.isAiGenerated ? (
                      <Badge className="rounded-full text-[9px]" variant="secondary">
                        AI matched
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_3rem_4.5rem] items-center gap-2 text-[11px]">
                    <p className="truncate font-medium text-foreground">{row.desc}</p>
                    <span className="text-muted-foreground">{row.qty}</span>
                    <span className="text-right font-medium text-foreground">
                      {formatMoney(row.priceInCents)}
                    </span>
                  </div>
                </div>
              ))}

              {isAiGenerating ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-[11px] text-muted-foreground">
                  <Spinner className="size-3.5 text-primary" />
                  Matching pricing library and past quotes...
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-border/70 px-3 py-2.5 sm:px-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-foreground">
              {items.length ? formatMoney(subtotal) : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Eye className="size-3" />
              {hasGenerated ? "Ready to review and send" : "Draft not sent"}
            </span>
            <Button
              className="h-7 px-2.5 text-[11px] sm:h-8 sm:px-3 sm:text-xs"
              disabled={!hasGenerated || isAiGenerating}
              size="sm"
              type="button"
              variant={hasGenerated ? "default" : "outline"}
            >
              <Send data-icon="inline-start" />
              Send quote
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  AI Chat                                   */
/* -------------------------------------------------------------------------- */

// Marketing AI assistant preview now reuses the real chat UI components.

function AIChatPreviewMock() {
  const quickActions = aiQuickActions.dashboard;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "m-1",
      role: "assistant",
      content:
        "Good morning, Jamie. What do you want to work on today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const nextIdRef = useRef(1);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      for (const t of timeoutsRef.current) clearTimeout(t);
    };
  }, []);

  const appendAssistantResponse = useCallback((userText: string) => {
    setIsStreaming(true);

    const response =
      userText.toLowerCase().includes("follow") ||
      userText.toLowerCase().includes("quote")
        ? "3 quotes need a follow-up this week. Want me to draft the next message for Sarah?"
        : "Got it. I can summarize open inquiries, draft follow-ups, and pull a weekly snapshot. What should we start with?";

    const t1 = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${nextIdRef.current++}`,
          role: "assistant",
          content: "",
          pending: true,
        },
      ]);
    }, 250);

    const t2 = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.pending
            ? {
                ...m,
                content: response,
                pending: false,
              }
            : m,
        ),
      );
      setIsStreaming(false);
    }, 950);

    timeoutsRef.current.push(t1, t2);
  }, []);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${nextIdRef.current++}`, role: "user", content: text },
    ]);
    appendAssistantResponse(text);
  }, [appendAssistantResponse, inputValue, isStreaming]);

  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (isStreaming) return;
      setMessages((prev) => [
        ...prev,
        { id: `u-${nextIdRef.current++}`, role: "user", content: prompt },
      ]);
      appendAssistantResponse(prompt);
    },
    [appendAssistantResponse, isStreaming],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden" data-chat-page>
      <div className="flex shrink-0 items-center justify-between px-4 py-2 sm:px-6">
        <Button size="sm" variant="outline" type="button">
          <Plus data-icon="inline-start" />
          New chat
        </Button>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" type="button" aria-label="History">
            <History className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
            <ChatMessageList
              messages={messages}
              rawMessages={[] as unknown as UIMessage[]}
              userName="Jamie"
              isPending={isStreaming}
              onRetry={() => {}}
              error={null}
            />
            {isStreaming ? (
              <div className="mt-2">
                <TextShimmer className="text-sm">Thinking...</TextShimmer>
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 pb-5">
          <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
            <div className="mb-2 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={isStreaming}
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  {action.label}
                </Button>
              ))}
            </div>

            <PromptInput
              value={inputValue}
              onValueChange={setInputValue}
              onSubmit={handleSend}
              isLoading={isStreaming}
              className="rounded-2xl border border-border bg-background"
            >
              <PromptInputTextarea
                placeholder={getPanelPlaceholder("dashboard")}
                className="text-sm"
              />
              <PromptInputActions className="justify-end pt-1">
                <PromptInputAction tooltip="Send message">
                  <Button
                    variant="default"
                    size="icon-sm"
                    className="rounded-full"
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isStreaming}
                    type="button"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </PromptInputAction>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Automations                                 */
/* -------------------------------------------------------------------------- */

function AutomationPreviewMock() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
        <WorkflowToolbar
          onAddNode={() => {}}
          onSave={() => {}}
          onValidate={() => {}}
          onUndo={() => {}}
          onRedo={() => {}}
          canUndo={false}
          canRedo={false}
        />
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-border/75 bg-background/95 shadow-[var(--surface-shadow-sm)]">
        {/* Static automation workflow preview - no ReactFlow */}
        <div className="relative h-full w-full overflow-auto bg-muted/5 p-6">
          {/* Grid background pattern */}
          <div 
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />
          
          {/* Workflow nodes */}
          <div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-4">
            {/* Trigger Node */}
            <div className="w-full rounded-xl border-2 border-primary/40 bg-background p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Eye className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Trigger
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    Quote viewed
                  </p>
                </div>
              </div>
            </div>

            {/* Connection line */}
            <div className="flex h-8 w-0.5 bg-border" />

            {/* Delay Node */}
            <div className="w-full rounded-xl border-2 border-border/70 bg-background p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Clock3 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Delay
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    Wait 3 days
                  </p>
                </div>
              </div>
            </div>

            {/* Connection line */}
            <div className="flex h-8 w-0.5 bg-border" />

            {/* Condition Node */}
            <div className="w-full rounded-xl border-2 border-amber-500/40 bg-background p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <CircleDot className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Condition
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    Quote accepted?
                  </p>
                </div>
              </div>
            </div>

            {/* Split connections */}
            <div className="relative flex w-full items-start justify-between gap-4">
              {/* Left branch - Yes */}
              <div className="flex flex-1 flex-col items-center gap-3">
                <div className="flex h-8 w-0.5 bg-border" />
                <div className="w-full rounded-xl border-2 border-emerald-500/40 bg-background p-3 shadow-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Check className="size-4" />
                      </div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Yes
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Create job from quote
                    </p>
                  </div>
                </div>
              </div>

              {/* Right branch - No */}
              <div className="flex flex-1 flex-col items-center gap-3">
                <div className="flex h-8 w-0.5 bg-border" />
                <div className="w-full rounded-xl border-2 border-border/70 bg-background p-3 shadow-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <X className="size-4" />
                      </div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        No
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Send follow-up reminder
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Analytics                                 */
/* -------------------------------------------------------------------------- */

type AnalyticsRange = "7d" | "30d" | "12m";

const analyticsFixtures: Record<
  AnalyticsRange,
  {
    stats: { label: string; value: string; delta: string; up: boolean }[];
    trend: number[];
    trendLabels: string[];
    funnel: { label: string; detail: string; count: number }[];
  }
> = {
  "7d": {
    stats: [
      { label: "Inquiries", value: "14", delta: "+18%", up: true },
      { label: "Quotes sent", value: "8", delta: "+12%", up: true },
      { label: "Won rate", value: "38%", delta: "+4 pts", up: true },
    ],
    trend: [4, 3, 6, 5, 8, 7, 9],
    trendLabels: ["M", "T", "W", "T", "F", "S", "S"],
    funnel: [
      { label: "Inquiries", detail: "From form & manual", count: 14 },
      { label: "Quoted", detail: "Sent in 24h avg", count: 8 },
      { label: "Viewed", detail: "Link opened", count: 6 },
      { label: "Accepted", detail: "Won jobs", count: 3 },
    ],
  },
  "30d": {
    stats: [
      { label: "Inquiries", value: "42", delta: "+22%", up: true },
      { label: "Quotes sent", value: "28", delta: "+15%", up: true },
      { label: "Won rate", value: "34%", delta: "-2 pts", up: false },
    ],
    trend: [10, 14, 16, 22, 18, 24, 28, 26],
    trendLabels: [
      "W1",
      "W1",
      "W2",
      "W2",
      "W3",
      "W3",
      "W4",
      "W4",
    ],
    funnel: [
      { label: "Inquiries", detail: "From form & manual", count: 42 },
      { label: "Quoted", detail: "Sent in 26h avg", count: 28 },
      { label: "Viewed", detail: "Link opened", count: 21 },
      { label: "Accepted", detail: "Won jobs", count: 11 },
    ],
  },
  "12m": {
    stats: [
      { label: "Inquiries", value: "315", delta: "+38%", up: true },
      { label: "Quotes sent", value: "198", delta: "+24%", up: true },
      { label: "Won rate", value: "41%", delta: "+6 pts", up: true },
    ],
    trend: [12, 16, 22, 28, 32, 30, 40, 44, 48, 46, 58, 64],
    trendLabels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    funnel: [
      { label: "Inquiries", detail: "From form & manual", count: 315 },
      { label: "Quoted", detail: "Sent in 28h avg", count: 198 },
      { label: "Viewed", detail: "Link opened", count: 152 },
      { label: "Accepted", detail: "Won jobs", count: 81 },
    ],
  },
};

function AnalyticsPreviewMock() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const data = analyticsFixtures[range];
  const maxFunnel = Math.max(...data.funnel.map((step) => step.count), 1);
  const maxTrend = Math.max(...data.trend, 1);

  const axisLabels = data.trendLabels.map((label, index) =>
    index > 0 && data.trendLabels[index - 1] === label ? "" : label,
  );

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="meta-label truncate pl-1">Performance</p>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border/70 bg-background/60 p-1 shadow-sm">
          {(
            [
              { key: "7d", label: "7d" },
              { key: "30d", label: "30d" },
              { key: "12m", label: "12m" },
            ] as const
          ).map((option) => (
            <button
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors sm:px-2.5 sm:py-1",
                range === option.key
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={option.key}
              onClick={() => setRange(option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {data.stats.map((stat) => (
          <div
            className="info-tile min-w-0 px-2.5 py-2.5 shadow-none sm:px-3 sm:py-3"
            key={stat.label}
          >
            <p className="meta-label truncate text-[9px] sm:text-[10px]">
              {stat.label}
            </p>
            <p className="mt-1 truncate text-base font-semibold tracking-tight text-foreground sm:mt-1.5 sm:text-xl">
              {stat.value}
            </p>
            <p
              className={cn(
                "mt-0.5 truncate text-[9px] font-medium sm:text-[10px]",
                stat.up ? "text-primary" : "text-muted-foreground",
              )}
            >
              {stat.up ? "▲" : "▼"} {stat.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/75 bg-background/95 p-3 shadow-[var(--surface-shadow-sm)] sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="meta-label">Pipeline trend</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-foreground sm:text-xs">
              Inquiries over time
            </p>
          </div>
          <span className="hidden shrink-0 items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex">
            <Calendar className="size-3" />
            {range === "7d"
              ? "Last 7 days"
              : range === "30d"
                ? "Last 30 days"
                : "Last 12 months"}
          </span>
        </div>

        <div className="mt-3 flex h-16 items-end gap-1 sm:mt-4 sm:h-20">
          {data.trend.map((value, index) => (
            <div
              className="group flex flex-1 flex-col justify-end gap-1"
              key={`${range}-${index}`}
            >
              <div
                className="rounded-t-sm bg-primary/25 transition-all duration-500 group-hover:bg-primary/55"
                style={{
                  height: `${Math.max(6, (value / maxTrend) * 100)}%`,
                }}
              />
              <p className="h-2.5 text-center text-[8px] leading-none text-muted-foreground/80">
                {axisLabels[index]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="soft-panel hidden flex-col gap-2 px-3 py-3 shadow-none sm:flex">
        <p className="meta-label">Funnel</p>
        <div className="flex flex-col gap-2">
          {data.funnel.map((step, index) => {
            const prior = index === 0 ? null : data.funnel[index - 1];
            const rate = prior
              ? Math.round((step.count / prior.count) * 100)
              : 100;
            return (
              <div
                className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2"
                key={step.label}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-foreground">
                      {step.label}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {step.count.toLocaleString()}
                    </p>
                    {prior ? (
                      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {rate}% of prior
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.max(3, Math.round((step.count / maxFunnel) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
