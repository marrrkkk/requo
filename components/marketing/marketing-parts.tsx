"use client";

import { useState } from "react";
import type { LandingFeatureId } from "@/components/marketing/marketing-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MarketingFeatureRow({
  title,
  description,
  previewTitle,
  previewDescription,
  featureId,
  reverse = false,
}: {
  title: string;
  description: string;
  previewTitle: string;
  previewDescription: string;
  featureId: LandingFeatureId;
  reverse?: boolean;
}) {
  return (
    <article
      className="[--page-gutter:1.25rem] overflow-x-clip py-5 sm:[--page-gutter:1.5rem] sm:py-7 lg:[--page-gutter:2rem] lg:py-8 xl:[--page-gutter:max(2rem,calc((100vw-72rem)/2))]"
      id={featureId}
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div
          className={cn(
            "px-[var(--page-gutter)]",
            reverse
              ? "lg:order-2 lg:pl-10 lg:pr-[var(--page-gutter)]"
              : "lg:pl-[var(--page-gutter)] lg:pr-10",
          )}
        >
          <div
            className={cn(
              "flex w-full max-w-[28rem] flex-col gap-4",
              reverse ? "lg:ml-auto" : "lg:mr-auto",
            )}
          >
            <h3 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {title}
            </h3>
            <p className="text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
        </div>

        <div className={cn("min-w-0 px-[var(--page-gutter)] lg:px-0", reverse && "lg:order-1")}>
          <MarketingFeaturePreview
            description={previewDescription}
            featureId={featureId}
            reverse={reverse}
            title={previewTitle}
          />
        </div>
      </div>
    </article>
  );
}

export function WorkflowStep({
  index,
  title,
  description,
  icon: Icon,
}: {
  index: number;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <article className="relative flex h-full flex-col gap-5 rounded-2xl border border-border/70 bg-background/50 p-6 shadow-sm transition-colors hover:bg-background/80 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <p className="font-heading text-4xl font-bold text-muted-foreground/20">
          0{index}
        </p>
      </div>
      <div className="mt-2 min-w-0 flex-1">
        <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-normal sm:leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
    </article>
  );
}

function MarketingFeaturePreview({
  featureId,
  title,
  description,
  reverse = false,
}: {
  featureId: LandingFeatureId;
  title: string;
  description: string;
  reverse?: boolean;
}) {
  return (
    <Card
      className={cn(
        "h-full min-h-[18rem] overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/95 shadow-[var(--surface-shadow-md)]",
        reverse
          ? "lg:rounded-l-none lg:border-l-0"
          : "lg:rounded-r-none lg:border-r-0",
      )}
      size="sm"
    >
      <CardHeader className="border-b border-border/70 bg-background/90 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="bg-muted/15 px-4 py-5 sm:px-6 sm:py-6">
        {featureId === "quotes" ? <QuotePreviewMock /> : null}
        {featureId === "forms" ? <FormsPreviewMock /> : null}
        {featureId === "analytics" ? <AnalyticsPreviewMock /> : null}
        {featureId === "collaboration" ? <CollaborationPreviewMock /> : null}
      </CardContent>
    </Card>
  );
}

function QuotePreviewMock() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {[
          { label: "Status", value: "Ready to send" },
          { label: "Valid for", value: "30 days" },
          { label: "Amount", value: "$4,250.00" },
        ].map((stat) => (
          <div className="info-tile px-3.5 py-3 shadow-none" key={stat.label}>
            <p className="meta-label">{stat.label}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <div className="rounded-xl border border-border/75 bg-background/95 p-4 shadow-[var(--surface-shadow-sm)]">
          <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
            <div className="flex flex-col gap-1">
              <p className="meta-label">Quote details</p>
              <p className="text-sm font-medium text-foreground">Complete Kitchen Remodel</p>
              <p className="text-xs text-muted-foreground">Sarah Jenkins • 123 Main St</p>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Quote #1042</p>
          </div>

          <div className="mt-4 grid gap-3">
            {[
              { desc: "Custom Cabinets & Hardware", qty: "1", price: "$2,400.00" },
              { desc: "Countertop Installation", qty: "1", price: "$1,200.00" },
              { desc: "Labor & Demo", qty: "40h", price: "$650.00" },
            ].map((row, i) => (
              <div
                className="soft-panel grid cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] gap-2 px-3 py-3 shadow-none transition-colors hover:border-primary/40 sm:grid-cols-[minmax(0,1fr)_4rem_5rem] sm:gap-3"
                key={i}
              >
                <span className="text-xs font-medium text-foreground">{row.desc}</span>
                <span className="text-xs text-muted-foreground">{row.qty}</span>
                <span className="text-right text-xs font-medium text-foreground">{row.price}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Totals</p>
            <div className="mt-4 flex flex-col gap-3">
              <PreviewMetric label="Subtotal" value="$4,250.00" />
              <PreviewMetric label="Discount" value="-$0.00" />
              <div className="mt-1 border-t border-border/50 pt-3">
                <PreviewMetric isTotal label="Total" value="$4,250.00" />
              </div>
            </div>
          </div>
          <button className="flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 shadow-sm">
            Send quote
          </button>
        </div>
      </div>
    </div>
  );
}

function FormsPreviewMock() {
  return (
    <div className="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
        <p className="meta-label">Fields</p>
        {[
          { label: "Project type", type: "Multiple choice" },
          { label: "Budget", type: "Currency" },
          { label: "Deadline", type: "Date picker" },
          { label: "Attachments", type: "File upload" },
        ].map((field) => (
          <div className="cursor-grab rounded-lg border border-border/70 bg-background/85 px-3 py-2.5 transition-colors hover:border-primary/40" key={field.label}>
            <p className="text-xs font-medium text-foreground">{field.label}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{field.type}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/75 bg-background p-4 shadow-[var(--surface-shadow-sm)]">
        <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
          <div>
            <p className="text-lg font-semibold text-foreground">Project Inquiry</p>
            <p className="mt-1 text-sm text-muted-foreground">We typically reply within 24 hours.</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            <div className="size-1.5 rounded-full bg-emerald-500" />
            Live
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {["Your name", "Project details", "Needed by", "Reference files"].map((field) => (
            <div className="grid gap-1.5" key={field}>
              <p className="text-xs font-medium text-foreground">{field}</p>
              <div className="flex h-9 cursor-text items-center rounded-md border border-border/70 bg-background/50 px-3 transition-colors hover:border-primary/50">
                <span className="text-[11px] text-muted-foreground/40">Enter {field.toLowerCase()}...</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <button className="flex h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Submit inquiry
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPreviewMock() {
  const [range, setRange] = useState<"30d" | "12m">("30d");
  const data = range === "30d" ? [28, 42, 34, 51, 46, 62, 58] : [12, 18, 24, 32, 28, 40, 36, 45, 50, 48, 65, 70];
  const labels = range === "30d" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
         <p className="meta-label pl-1">Performance</p>
         <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/50 p-1 shadow-sm">
          <button
            className={cn("rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors", range === "30d" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setRange("30d")}
          >
            30 Days
          </button>
          <button
            className={cn("rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors", range === "12m" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setRange("12m")}
          >
            12 Months
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <PreviewStatCard label="Inquiries" value={range === "30d" ? "42" : "315"} />
        <PreviewStatCard label="Quotes sent" value={range === "30d" ? "18" : "142"} />
        <PreviewStatCard label="Won rate" value={range === "30d" ? "34%" : "38%"} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <div className="rounded-xl border border-border/75 bg-background/95 p-4 shadow-[var(--surface-shadow-sm)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="meta-label">Pipeline trend</p>
              <p className="mt-1 text-sm font-medium text-foreground">Revenue by stage</p>
            </div>
          </div>

          <div className="mt-6 flex h-40 items-end gap-1.5 transition-all duration-300 sm:gap-3">
            {data.map((height, index) => (
              <div className="group flex flex-1 cursor-crosshair flex-col justify-end gap-2" key={index}>
                <div
                  className="rounded-t-sm bg-primary/20 transition-all duration-500 group-hover:bg-primary/50"
                  style={{ height: `${height * 1.5}px` }}
                />
                <p className="text-center text-[9px] text-muted-foreground">
                  {labels[index]}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Stage breakdown</p>
            <div className="mt-4 flex flex-col gap-3">
              <PreviewMetric label="Waiting review" value={range === "30d" ? "12 leads" : "45 leads"} />
              <PreviewMetric label="Quoted" value={range === "30d" ? "5 quotes" : "28 quotes"} />
              <PreviewMetric label="Follow-up due" value={range === "30d" ? "3 alerts" : "12 alerts"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollaborationPreviewMock() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
      <div className="rounded-xl border border-border/75 bg-background/95 p-4 shadow-[var(--surface-shadow-sm)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <p className="meta-label">Shared activity</p>
            <p className="mt-1 text-sm font-medium text-foreground">Project Timeline</p>
          </div>
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px] font-medium text-muted-foreground" key={i}>
                {["A", "M", "Y"][i - 1]}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {[
            { name: "Ava", action: "shared the quote link", time: "2h ago" },
            { name: "Mark", action: "added an internal note", time: "4h ago" },
            { name: "You", action: "marked follow-up for Friday", time: "1d ago" },
          ].map((item) => (
            <div
              className="soft-panel flex cursor-pointer items-start gap-3 px-3 py-3 shadow-none transition-colors hover:border-primary/40"
              key={item.action}
            >
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                {item.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {item.name} <span className="font-normal text-muted-foreground">{item.action}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.time}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border/70 pt-3">
          <div className="flex items-center gap-3">
             <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">Y</div>
             <div className="flex h-9 flex-1 cursor-text items-center rounded-md border border-border/70 bg-background/50 px-3 transition-colors hover:border-primary/50">
               <span className="text-[11px] text-muted-foreground/40">Add an internal note...</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="soft-panel px-4 py-4 shadow-none">
          <p className="meta-label">Team access</p>
          <div className="mt-4 grid gap-2">
            {[
              { role: "Owner", access: "Full access" },
              { role: "Ops", access: "Can edit" },
              { role: "Estimator", access: "Quotes only" },
            ].map((item) => (
              <div
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border/70 bg-background/90 px-3 py-2.5 transition-colors hover:border-primary/40"
                key={item.role}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-6 items-center justify-center rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                    {item.role[0]}
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {item.role}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-primary">{item.access} ▾</span>
              </div>
            ))}
          </div>
        </div>
        <div className="soft-panel px-4 py-4 shadow-none">
          <p className="meta-label">Customer history</p>
          <div className="mt-3 grid gap-2">
            {[
              "2 past quotes won",
              "Last reply 4 days ago",
              "Install notes saved",
            ].map((label) => (
              <div
                className="rounded-lg border border-border/70 bg-background/90 px-3 py-2.5 text-xs text-muted-foreground"
                key={label}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  isTotal = false,
}: {
  label: string;
  value: string;
  isTotal?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={cn("text-xs", isTotal ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-xs", isTotal ? "font-semibold text-foreground" : "font-medium text-foreground")}>{value}</span>
    </div>
  );
}

function PreviewStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="info-tile px-4 py-4 shadow-none">
      <p className="meta-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
