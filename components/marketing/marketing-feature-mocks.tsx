"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BellRing,
  Calendar,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  Copy,
  Eye,
  FileText,
  MessageCircle,
  Send,
  SkipForward,
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
  if (featureId === "follow-ups") return <FollowUpsPreviewMock />;
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
/*                                 Follow-ups                                 */
/* -------------------------------------------------------------------------- */

type FollowUpTask = {
  id: string;
  title: string;
  reason: string;
  customer: string;
  relatedLabel: string;
  dueLabel: string;
  dueBucket: "overdue" | "today" | "soon";
  channel: string;
  suggestedMessage: string;
};

const followUpSeed: readonly FollowUpTask[] = [
  {
    id: "fu-1",
    title: "Nudge Sarah on the remodel quote",
    reason: "Viewed 2 days ago, no reply.",
    customer: "Sarah Jenkins",
    relatedLabel: "Q-1042",
    dueLabel: "Overdue · 2d",
    dueBucket: "overdue",
    channel: "Email",
    suggestedMessage:
      "Hi Sarah, following up on the kitchen remodel quote. Happy to walk through the cabinet options if helpful.",
  },
  {
    id: "fu-2",
    title: "Check in with Maya",
    reason: "Quote expires this Friday.",
    customer: "Maya Fields",
    relatedLabel: "Q-1043",
    dueLabel: "Due today",
    dueBucket: "today",
    channel: "WhatsApp",
    suggestedMessage:
      "Hey Maya, a quick check-in on the studio fit-out quote before it expires Friday.",
  },
  {
    id: "fu-3",
    title: "Send install window to Ana",
    reason: "Accepted last week.",
    customer: "Ana Cruz",
    relatedLabel: "Q-1038",
    dueLabel: "Due Fri",
    dueBucket: "soon",
    channel: "SMS",
    suggestedMessage:
      "Hi Ana, confirming the countertop install window for next week. I will share two options shortly.",
  },
];

type FollowUpState = "pending" | "completed" | "skipped";

function FollowUpDuePill({ bucket }: { bucket: FollowUpTask["dueBucket"] }) {
  const label =
    bucket === "overdue" ? "Overdue" : bucket === "today" ? "Today" : "Soon";
  return (
    <Badge
      className="shrink-0 rounded-full"
      variant={
        bucket === "overdue"
          ? "destructive"
          : bucket === "today"
            ? "default"
            : "outline"
      }
    >
      <Timer data-icon="inline-start" />
      {label}
    </Badge>
  );
}

function FollowUpsPreviewMock() {
  const [states, setStates] = useState<Record<string, FollowUpState>>({
    "fu-1": "pending",
    "fu-2": "pending",
    "fu-3": "pending",
  });
  const [copied, setCopied] = useState<string | null>(null);

  function setState(id: string, next: FollowUpState) {
    setStates((prev) => ({ ...prev, [id]: next }));
  }

  function handleCopy(id: string) {
    setCopied(id);
    window.setTimeout(() => {
      setCopied((current) => (current === id ? null : current));
    }, 1200);
  }

  const pendingCount = Object.values(states).filter(
    (value) => value === "pending",
  ).length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="meta-label">
          Pending · {pendingCount} of {followUpSeed.length}
        </p>
        <span className="hidden shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground sm:inline-flex">
          <BellRing className="size-3" />
          Reminders keep quotes from going cold
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground sm:hidden">
          <BellRing className="size-3" />
          Reminders
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {followUpSeed.map((task, index) => {
          const state = states[task.id] ?? "pending";
          const isDone = state === "completed";
          const isSkipped = state === "skipped";
          const hiddenOnMobile = index >= 2;

          return (
            <div
              className={cn(
                "soft-panel flex flex-col gap-2.5 px-3 py-3 shadow-none transition-colors sm:px-4",
                isDone && "border-primary/40 bg-primary/5",
                isSkipped && "opacity-60",
                hiddenOnMobile && "hidden sm:flex",
              )}
              key={task.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      className={cn(
                        "min-w-0 truncate text-xs font-semibold text-foreground sm:text-sm",
                        (isDone || isSkipped) && "line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    {state === "pending" ? (
                      <FollowUpDuePill bucket={task.dueBucket} />
                    ) : (
                      <Badge
                        className="shrink-0 rounded-full"
                        variant={isDone ? "default" : "outline"}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 data-icon="inline-start" />
                            Done
                          </>
                        ) : (
                          <>
                            <SkipForward data-icon="inline-start" />
                            Skipped
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {task.reason}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <Badge className="shrink-0 rounded-full" variant="outline">
                  {task.customer}
                </Badge>
                <Badge
                  className="hidden shrink-0 rounded-full sm:inline-flex"
                  variant="outline"
                >
                  {task.relatedLabel}
                </Badge>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3" />
                  {task.dueLabel}
                </span>
                <span aria-hidden="true" className="hidden sm:inline">
                  ·
                </span>
                <span className="hidden items-center gap-1 sm:inline-flex">
                  <MessageCircle className="size-3" />
                  {task.channel}
                </span>
              </div>

              {state === "pending" ? (
                <>
                  <div className="hidden rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[11px] leading-5 text-muted-foreground sm:block">
                    {task.suggestedMessage}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      className="hidden h-7 px-2.5 text-[11px] sm:inline-flex"
                      onClick={() => handleCopy(task.id)}
                      size="sm"
                      variant="outline"
                    >
                      {copied === task.id ? (
                        <>
                          <Check data-icon="inline-start" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy data-icon="inline-start" />
                          Copy message
                        </>
                      )}
                    </Button>
                    <Button
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => setState(task.id, "completed")}
                      size="sm"
                    >
                      <Check data-icon="inline-start" />
                      Mark done
                    </Button>
                    <Button
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => setState(task.id, "skipped")}
                      size="sm"
                      variant="ghost"
                    >
                      <SkipForward data-icon="inline-start" />
                      Skip
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  className="h-7 w-fit px-2.5 text-[11px]"
                  onClick={() => setState(task.id, "pending")}
                  size="sm"
                  variant="ghost"
                >
                  <ArrowRight data-icon="inline-start" />
                  Undo
                </Button>
              )}
            </div>
          );
        })}
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
