import {
  CheckCircle2,
  Plus,
  ReceiptText,
  SendHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

import type { LandingFeatureId } from "@/components/marketing/marketing-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FollowUpDueBadge } from "@/features/follow-ups/components/follow-up-status-badge";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { cn } from "@/lib/utils";

export function MarketingFeatureMock({
  featureId,
}: {
  featureId: LandingFeatureId;
}) {
  if (featureId === "inquiries") return <InquiriesPreviewMock />;
  if (featureId === "quotes") return <QuotePreviewMock />;
  if (featureId === "followUps") return <FollowUpsPreviewMock />;
  if (featureId === "ai") return <AIDraftPreviewMock />;
  return <AnalyticsPreviewMock />;
}

export function MarketingMockFrame({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex h-[20.5rem] w-full flex-col bg-background text-left font-sans select-none sm:h-[22rem]"
      inert
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <p className="truncate text-base font-semibold tracking-tight text-foreground">
          {title}
        </p>
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">{children}</div>
    </div>
  );
}

function MockButton({
  children,
  variant = "default",
  size = "sm",
}: {
  children: ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "xs" | "sm" | "default";
}) {
  return (
    <Button size={size} tabIndex={-1} type="button" variant={variant}>
      {children}
    </Button>
  );
}

function InquiriesPreviewMock() {
  const inquiries = [
    {
      name: "Sarah Jenkins",
      service: "Kitchen remodel",
      time: "2m ago",
      status: "new" as const,
      selected: true,
    },
    {
      name: "Leo Park",
      service: "Custom bookshelves",
      time: "1h ago",
      status: "quoted" as const,
      selected: false,
    },
    {
      name: "Maya Fields",
      service: "Hardwood refinishing",
      time: "Yesterday",
      status: "waiting" as const,
      selected: false,
    },
  ];

  return (
    <MarketingMockFrame
      action={
        <MockButton>
          <Plus data-icon="inline-start" />
          Quick-add inquiry
        </MockButton>
      }
      title="Inquiries"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-card">
        {inquiries.map((inquiry, index) => (
          <div
            className={cn(
              "flex flex-1 items-center justify-between gap-3 px-4 py-3",
              index > 0 && "border-t border-border/70",
              inquiry.selected && "bg-primary/5",
            )}
            key={inquiry.name}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                {inquiry.name}
              </p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {inquiry.service}
                <span aria-hidden="true" className="text-muted-foreground/40">
                  {" "}
                  ·{" "}
                </span>
                {inquiry.time}
              </p>
            </div>
            <InquiryStatusBadge status={inquiry.status} />
          </div>
        ))}
      </div>
    </MarketingMockFrame>
  );
}

function QuotePreviewMock() {
  const lineItems = [
    { description: "Maple cabinets", total: "$4,480" },
    { description: "Quartz countertop", total: "$3,740" },
  ] as const;

  return (
    <MarketingMockFrame
      action={
        <MockButton>
          <SendHorizontal data-icon="inline-start" />
          Send quote
        </MockButton>
      }
      title="Quote Q-1048"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            Sarah Jenkins
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            Kitchen remodel
          </p>
        </div>
        <QuoteStatusBadge status="draft" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-card">
        {lineItems.map((item, index) => (
          <div
            className={cn(
              "flex flex-1 items-center justify-between gap-3 px-4 py-3",
              index > 0 && "border-t border-border/70",
            )}
            key={item.description}
          >
            <p className="truncate text-sm font-medium text-foreground">
              {item.description}
            </p>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {item.total}
            </p>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-border/80 bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-base font-semibold tabular-nums tracking-tight text-foreground">
            $8,220
          </p>
        </div>
      </div>
    </MarketingMockFrame>
  );
}

function FollowUpsPreviewMock() {
  const followUps = [
    {
      title: "Follow up on kitchen quote",
      customer: "Sarah Jenkins",
      bucket: "today" as const,
      primary: true,
    },
    {
      title: "Check in on bookshelves",
      customer: "Leo Park",
      bucket: "upcoming" as const,
      primary: false,
    },
  ];

  return (
    <MarketingMockFrame title="Follow-ups">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {followUps.map((item) => (
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col justify-center gap-3 rounded-xl border px-4 py-3",
              item.primary
                ? "border-border/80 bg-primary/5"
                : "border-border/80 bg-card",
            )}
            key={item.title}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {item.customer}
                </p>
              </div>
              <FollowUpDueBadge bucket={item.bucket} />
            </div>
            <div className="flex justify-end">
              <MockButton variant={item.primary ? "default" : "outline"}>
                <CheckCircle2 data-icon="inline-start" />
                Mark done
              </MockButton>
            </div>
          </div>
        ))}
      </div>
    </MarketingMockFrame>
  );
}

function AIDraftPreviewMock() {
  const lineItems = [
    { description: "Maple cabinets", total: "$4,480" },
    { description: "Quartz countertop", total: "$3,740" },
  ] as const;

  return (
    <MarketingMockFrame
      action={
        <MockButton>
          <Sparkles data-icon="inline-start" />
          Generate with AI
        </MockButton>
      }
      title="Draft with AI"
    >
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <Sparkles className="size-4 shrink-0 text-primary" />
        <p className="truncate text-sm text-foreground">
          <span className="font-semibold">Sarah Jenkins</span>
          <span className="text-muted-foreground"> · Kitchen remodel</span>
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-card">
        {lineItems.map((item, index) => (
          <div
            className={cn(
              "flex flex-1 items-center justify-between gap-3 px-4 py-3",
              index > 0 && "border-t border-border/70",
            )}
            key={item.description}
          >
            <p className="truncate text-sm font-medium text-foreground">
              {item.description}
            </p>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {item.total}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <MockButton>
          <ReceiptText data-icon="inline-start" />
          Apply draft
        </MockButton>
      </div>
    </MarketingMockFrame>
  );
}

function AnalyticsPreviewMock() {
  const metrics = [
    { label: "Inquiries", value: "24" },
    { label: "Quotes sent", value: "16" },
    { label: "Accepted", value: "11" },
  ] as const;

  const funnel = [
    { label: "Inquiries", value: 24, width: "100%" },
    { label: "Quoted", value: 16, width: "67%" },
    { label: "Accepted", value: 11, width: "46%" },
  ] as const;

  return (
    <MarketingMockFrame
      action={
        <Badge variant="secondary">
          <TrendingUp data-icon="inline-start" />
          Last 30 days
        </Badge>
      }
      title="Analytics"
    >
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div className="soft-panel px-3 py-3" key={metric.label}>
            <p className="meta-label">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-3">
        {funnel.map((step) => (
          <div className="flex flex-col gap-1.5" key={step.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{step.label}</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {step.value}
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: step.width }}
              />
            </div>
          </div>
        ))}
      </div>
    </MarketingMockFrame>
  );
}
