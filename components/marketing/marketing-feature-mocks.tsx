"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Calendar,
  Check,
  CircleDot,
  Clock3,
  Copy,
  Eye,
  FileText,
  Send,
  Timer,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { LandingFeatureId } from "@/components/marketing/marketing-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MarketingFeatureMock({
  featureId,
}: {
  featureId: LandingFeatureId;
}) {
  if (featureId === "inquiries") return <InquiriesPreviewMock />;
  if (featureId === "quotes") return <QuotePreviewMock />;
  if (featureId === "jobs") return <JobsPreviewMock />;
  if (featureId === "ai") return <AIChatPreviewMock />;
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
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Quotes                                   */
/* -------------------------------------------------------------------------- */

type QuoteDraft = {
  id: string;
  number: string;
  title: string;
  customer: string;
  address: string;
  validDays: number;
  items: { desc: string; qty: string; priceInCents: number }[];
  discountInCents: number;
};

const quoteDrafts: readonly QuoteDraft[] = [
  {
    id: "q-1042",
    number: "Q-1042",
    title: "Kitchen Remodel",
    customer: "Sarah Jenkins",
    address: "123 Main St",
    validDays: 30,
    items: [
      { desc: "Custom cabinets & hardware", qty: "1", priceInCents: 240000 },
      { desc: "Countertop installation", qty: "1", priceInCents: 120000 },
      { desc: "Labor & demo", qty: "40h", priceInCents: 65000 },
    ],
    discountInCents: 0,
  },
  {
    id: "q-1043",
    number: "Q-1043",
    title: "Studio Fit-out",
    customer: "Maya Fields",
    address: "86 Harper Ave",
    validDays: 14,
    items: [
      { desc: "Built-in shelving", qty: "1", priceInCents: 180000 },
      { desc: "Lighting package", qty: "6", priceInCents: 48000 },
      { desc: "Finish & install", qty: "24h", priceInCents: 42000 },
    ],
    discountInCents: 15000,
  },
  {
    id: "q-1044",
    number: "Q-1044",
    title: "Tile Repair",
    customer: "Leo Park",
    address: "19 Park Row",
    validDays: 7,
    items: [
      { desc: "Bathroom tile patch", qty: "1", priceInCents: 42000 },
      { desc: "Grout & sealing", qty: "1", priceInCents: 12000 },
      { desc: "Labor", qty: "6h", priceInCents: 18000 },
    ],
    discountInCents: 0,
  },
];

function formatMoney(cents: number) {
  const value = cents / 100;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function QuotePreviewMock() {
  const [selectedId, setSelectedId] = useState<string>(quoteDrafts[0].id);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const active =
    quoteDrafts.find((draft) => draft.id === selectedId) ?? quoteDrafts[0];

  const subtotal = active.items.reduce(
    (sum, item) => sum + item.priceInCents,
    0,
  );
  const total = subtotal - active.discountInCents;
  const isSent = sent[active.id] ?? false;

  return (
    <div className="grid gap-3 lg:grid-cols-[11rem_minmax(0,1fr)]">
      <div className="soft-panel flex flex-col gap-2 px-2.5 py-2.5 shadow-none sm:px-3 sm:py-3">
        <p className="meta-label hidden px-1 lg:block">Drafts</p>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {quoteDrafts.map((draft) => {
            const isActive = draft.id === active.id;
            return (
              <button
                className={cn(
                  "flex shrink-0 w-[8.25rem] flex-col gap-0.5 rounded-md border px-2.5 py-2 text-left transition-colors lg:w-full",
                  isActive
                    ? "border-primary/40 bg-primary/8 text-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-background/70 hover:text-foreground",
                )}
                key={draft.id}
                onClick={() => setSelectedId(draft.id)}
                type="button"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-medium">
                    {draft.number}
                  </span>
                  {sent[draft.id] ? (
                    <Check className="size-3 shrink-0 text-primary" />
                  ) : null}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {draft.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border/75 bg-background/95 p-3 shadow-[var(--surface-shadow-sm)] sm:p-4">
        <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3 sm:pb-4">
          <div className="min-w-0">
            <p className="meta-label">Quote</p>
            <p className="mt-1 truncate text-xs font-semibold text-foreground sm:text-sm">
              {active.title}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[11px]">
              {active.customer} · {active.address}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium text-foreground sm:text-[11px]">
              {active.number}
            </p>
            <p className="mt-0.5 text-[9px] text-muted-foreground sm:text-[10px]">
              Valid {active.validDays} days
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-1.5">
          {active.items.map((row, i) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2.5 py-2 text-[11px] sm:grid-cols-[minmax(0,1fr)_3rem_5rem]"
              key={i}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {row.desc}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground sm:hidden">
                  × {row.qty}
                </p>
              </div>
              <span className="hidden text-muted-foreground sm:inline">
                {row.qty}
              </span>
              <span className="text-right font-medium text-foreground">
                {formatMoney(row.priceInCents)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-md border border-border/60 bg-muted/25 px-2.5 py-2.5 sm:px-3 sm:py-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-medium text-foreground">
              {formatMoney(subtotal)}
            </span>
          </div>
          {active.discountInCents > 0 ? (
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Discount</span>
              <span className="font-medium text-foreground">
                -{formatMoney(active.discountInCents)}
              </span>
            </div>
          ) : null}
          <div className="mt-2 border-t border-border/60 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Eye className="size-3" />
            Not yet viewed
          </span>
          <Button
            className="h-7 px-2.5 text-[11px] sm:h-8 sm:px-3 sm:text-xs"
            onClick={() =>
              setSent((prev) => ({ ...prev, [active.id]: !prev[active.id] }))
            }
            size="sm"
            variant={isSent ? "outline" : "default"}
          >
            {isSent ? (
              <>
                <Check data-icon="inline-start" />
                Sent
              </>
            ) : (
              <>
                <Send data-icon="inline-start" />
                Send quote
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  AI Chat                                   */
/* -------------------------------------------------------------------------- */

const quickActions = [
  {
    label: "Open inquiries",
    color: "blue" as const,
    prompt: "Summarize open inquiries",
    response: [
      "You have **5 open inquiries** right now:",
      "",
      "• **Sarah Jenkins**: Kitchen remodel. New, submitted today.",
      "• **Leo Park**: Tile repair. Quoted, awaiting reply.",
      "• **Maya Fields**: Studio fit-out. Waiting on scope details.",
      "• **Jordan Kim**: Built-in shelving. New, 3 days old.",
      "• **Ana Cruz**: Countertop. Won, ready to schedule.",
      "",
      "2 are new and need a first reply. Want me to prioritize them?",
    ],
  },
  {
    label: "Quote follow-ups",
    color: "purple" as const,
    prompt: "Which quotes need follow-up?",
    response: [
      "**3 quotes** need attention this week:",
      "",
      "• **Q-1042**: Kitchen remodel for Sarah. Viewed 2 days ago, no reply.",
      "• **Q-1044**: Tile repair for Leo. Sent yesterday, not yet opened.",
      "• **Q-1043**: Studio fit-out for Maya. Expires Friday.",
      "",
      "Want me to draft a follow-up for any of these?",
    ],
  },
  {
    label: "Urgent work",
    color: "orange" as const,
    prompt: "What's urgent today?",
    response: [
      "Here's what needs action today:",
      "",
      "• **Q-1042** is going cold. Viewed but no reply in 2 days. Follow up before the weekend.",
      "• **Maya's fit-out** quote expires Friday. Send a reminder now.",
      "• **Jordan Kim's** inquiry is 3 days old with no quote yet.",
      "",
      "I'd suggest starting with Sarah's follow-up since she already viewed the quote.",
    ],
  },
  {
    label: "Weekly summary",
    color: "teal" as const,
    prompt: "Give me a weekly summary",
    response: [
      "**This week at BrightSide:**",
      "",
      "• **4 new inquiries** captured (↑ 2 vs last week)",
      "• **8 quotes sent**: 6 viewed, 3 accepted",
      "• **75% view rate** (↑ 6 pts)",
      "• **$14,650 total quoted** this week",
      "",
      "Top win: Ana Cruz accepted the countertop job ($1,200). Your average time-to-quote improved to 4 hours.",
    ],
  },
];

const quickActionColors: Record<string, string> = {
  blue: "border-blue-200/80 bg-blue-100/50 text-blue-800 shadow-sm shadow-blue-100/50 hover:bg-blue-100 dark:border-blue-700/40 dark:bg-blue-900/30 dark:text-blue-200 dark:shadow-blue-900/20 dark:hover:bg-blue-900/50",
  purple: "border-purple-200/80 bg-purple-100/50 text-purple-800 shadow-sm shadow-purple-100/50 hover:bg-purple-100 dark:border-purple-700/40 dark:bg-purple-900/30 dark:text-purple-200 dark:shadow-purple-900/20 dark:hover:bg-purple-900/50",
  orange: "border-orange-200/80 bg-orange-100/50 text-orange-800 shadow-sm shadow-orange-100/50 hover:bg-orange-100 dark:border-orange-700/40 dark:bg-orange-900/30 dark:text-orange-200 dark:shadow-orange-900/20 dark:hover:bg-orange-900/50",
  teal: "border-teal-200/80 bg-teal-100/50 text-teal-800 shadow-sm shadow-teal-100/50 hover:bg-teal-100 dark:border-teal-700/40 dark:bg-teal-900/30 dark:text-teal-200 dark:shadow-teal-900/20 dark:hover:bg-teal-900/50",
};

type VisibleMessage = {
  id: string;
  role: "user" | "assistant";
  lines: string[];
  isTyping?: boolean;
};

function AIChatPreviewMock() {
  const [messages, setMessages] = useState<VisibleMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idCounter = useRef(0);

  function nextId(prefix: string) {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  }

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  function sendMessage(prompt: string, responseLines: string[]) {
    if (isTyping) return;

    // Add user message
    const userMsg: VisibleMessage = {
      id: nextId("u"),
      role: "user",
      lines: [prompt],
    };
    const typingId = nextId("t");
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Scroll after user message
    setTimeout(scrollToBottom, 50);

    // Add typing indicator
    const typingMsg: VisibleMessage = {
      id: typingId,
      role: "assistant",
      lines: [],
      isTyping: true,
    };
    const typingDelay = setTimeout(() => {
      setMessages((prev) => [...prev, typingMsg]);
      setTimeout(scrollToBottom, 50);
    }, 400);

    // Replace with actual response
    const responseDelay = setTimeout(() => {
      const assistantMsg: VisibleMessage = {
        id: nextId("a"),
        role: "assistant",
        lines: responseLines,
      };
      setMessages((prev) =>
        prev.filter((m) => m.id !== typingId).concat(assistantMsg),
      );
      setIsTyping(false);
      setTimeout(scrollToBottom, 50);
    }, 1400);

    typingTimeoutRef.current = responseDelay;

    return () => {
      clearTimeout(typingDelay);
      clearTimeout(responseDelay);
    };
  }

  function handleQuickAction(action: (typeof quickActions)[number]) {
    sendMessage(action.prompt, action.response);
  }

  const showEmptyState = messages.length === 0 && !isTyping;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {showEmptyState ? (
        /* Empty state — greeting + centered input */
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="mx-auto w-full max-w-md text-center">
            <h3 className="mb-1 font-heading text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
              Good morning, Jamie
            </h3>
            <p className="mb-5 text-[11px] text-muted-foreground sm:text-sm">
              How can I help with your business today?
            </p>

            <div className="flex items-center rounded-2xl bg-muted/70 px-3.5 py-2.5 sm:px-4 sm:py-3">
              <span className="min-w-0 flex-1 truncate text-left text-[11px] text-muted-foreground/70 sm:text-sm">
                Ask about inquiries, quotes, and follow-ups...
              </span>
              <span className="ml-2 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:size-8">
                <ArrowUp className="size-3.5 sm:size-4" />
              </span>
            </div>

            <div className="mt-3.5 flex flex-wrap justify-center gap-1.5 sm:mt-4 sm:gap-2">
              {quickActions.map((action) => (
                <button
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors sm:px-3.5 sm:py-1.5 sm:text-[0.8rem]",
                    quickActionColors[action.color],
                  )}
                  key={action.label}
                  onClick={() => handleQuickAction(action)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active chat — messages */
        <div
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5"
          ref={scrollRef}
        >
          {messages.map((msg) =>
            msg.isTyping ? (
              <div className="flex w-full gap-2.5" key={msg.id}>
                <div className="flex items-center gap-1.5 rounded-2xl bg-muted/40 px-4 py-3">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                </div>
              </div>
            ) : msg.role === "user" ? (
              <div className="flex w-full justify-end" key={msg.id}>
                <div className="max-w-[80%] rounded-2xl bg-black/[0.06] px-3.5 py-2 dark:bg-white/[0.08]">
                  <p className="whitespace-pre-wrap text-[11px] leading-5 text-foreground sm:text-sm sm:leading-6">
                    {msg.lines[0]}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex w-full gap-2.5" key={msg.id}>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] leading-5 text-foreground sm:text-sm sm:leading-6">
                    {msg.lines.map((line, i) => {
                      if (line === "") return <div className="h-1.5" key={i} />;
                      if (line.startsWith(">")) {
                        return (
                          <p
                            className="my-1.5 border-l-2 border-primary/40 pl-2.5 text-muted-foreground italic"
                            key={i}
                          >
                            {line.slice(2)}
                          </p>
                        );
                      }
                      if (line.startsWith("•")) {
                        return (
                          <p className="pl-1" key={i}>
                            {renderBold(line)}
                          </p>
                        );
                      }
                      return <p key={i}>{renderBold(line)}</p>;
                    })}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Input area — always visible when chat is active */}
      {!showEmptyState ? (
        <div className="shrink-0 border-t border-border/70 px-3 pb-3 pt-2 sm:px-5 sm:pb-4 sm:pt-3">
          <div className="flex items-center rounded-2xl bg-muted/70 px-3.5 py-2.5 sm:px-4 sm:py-3">
            <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground/70 sm:text-sm">
              Ask a follow-up question...
            </span>
            <span className="ml-2 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:size-8">
              <ArrowUp className="size-3.5 sm:size-4" />
            </span>
          </div>
          {/* Quick actions below input */}
          <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3">
            {quickActions.map((action) => (
              <button
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[9px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1 sm:text-[0.75rem]",
                  quickActionColors[action.color],
                )}
                disabled={isTyping}
                key={action.label}
                onClick={() => handleQuickAction(action)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span className="font-semibold" key={i}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
}

/* -------------------------------------------------------------------------- */
/*                                    Jobs                                    */
/* -------------------------------------------------------------------------- */

const jobItems = [
  { id: "ji-1", description: "Discovery and creative direction", completed: true, price: "$825" },
  { id: "ji-2", description: "Design production", completed: true, price: "$1,650" },
  { id: "ji-3", description: "Revision round", completed: false, price: "$450" },
] as const;

function JobsPreviewMock() {
  const completedCount = jobItems.filter((i) => i.completed).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Job header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Landing Page Design</h3>
          <Badge variant="default" className="text-[10px]">In Progress</Badge>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {completedCount}/{jobItems.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.round((completedCount / jobItems.length) * 100)}%` }}
        />
      </div>

      {/* Work items */}
      <div className="flex flex-col divide-y divide-border/50">
        {jobItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2.5">
            <div className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full",
              item.completed ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "border border-border text-transparent",
            )}>
              {item.completed && <Check className="size-2.5" />}
            </div>
            <span className={cn(
              "flex-1 text-sm",
              item.completed ? "text-muted-foreground line-through" : "text-foreground",
            )}>
              {item.description}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">{item.price}</span>
          </div>
        ))}
      </div>

      {/* Invoice CTA */}
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium text-foreground">Ready to invoice</span>
          <span className="text-[10px] text-muted-foreground">Quote Q-2011 · $4,275</span>
        </div>
        <Button size="sm" className="h-7 text-xs">
          Generate invoice
        </Button>
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
