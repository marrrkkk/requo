import {
  ArrowRight,
  Bot,
  Check,
  Clock3,
  FileText,
  Inbox,
  Mail,
  MoreHorizontal,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  Workflow,
} from "lucide-react";

import type { LandingFeatureId } from "@/components/marketing/marketing-data";
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
  return <AnalyticsPreviewMock />;
}

function PreviewHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[0.55rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</p>
      </div>
      {action}
    </div>
  );
}

function InquiriesPreviewMock() {
  const rows = [
    ["Sarah Jenkins", "Kitchen remodel", "New"],
    ["Leo Park", "Tile repair", "Quoted"],
    ["Maya Fields", "Custom cabinetry", "Follow up"],
  ] as const;

  return (
    <div className="bg-background">
      <PreviewHeader
        eyebrow="Inbox"
        title="Customer requests"
        action={<span className="rounded-full bg-primary/10 px-2 py-1 text-[0.6rem] font-medium text-primary">6 new</span>}
      />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-[0.7rem] text-muted-foreground">
          <Search className="size-3.5" />
          <span className="flex-1">Search customers or services</span>
          <span className="rounded-md bg-card px-1.5 py-0.5 text-[0.55rem]">All</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="grid grid-cols-[1.35fr_1fr_auto] gap-3 border-b border-border/60 bg-muted/30 px-3 py-2 text-[0.55rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span>Customer</span><span>Service</span><span>Status</span>
          </div>
          {rows.map(([name, service, status], index) => (
            <div className="grid grid-cols-[1.35fr_1fr_auto] items-center gap-3 border-b border-border/50 px-3 py-3 last:border-0" key={name}>
              <div className="min-w-0">
                <p className="truncate text-[0.72rem] font-medium text-foreground">{name}</p>
                <p className="truncate text-[0.6rem] text-muted-foreground">{index === 0 ? "Contact form · 2 min ago" : "Manual entry · Today"}</p>
              </div>
              <span className="truncate text-[0.65rem] text-muted-foreground">{service}</span>
              <span className={cn("rounded-full px-2 py-1 text-[0.56rem] font-medium", index === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{status}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.05] px-3 py-2.5">
          <Inbox className="size-3.5 text-primary" />
          <p className="flex-1 text-[0.65rem] text-foreground"><span className="font-semibold">Sarah is ready to quote.</span> Turn this request into a draft.</p>
          <ArrowRight className="size-3.5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function QuotePreviewMock() {
  const items = [["Cabinets & hardware", "$2,400"], ["Quartz countertop", "$1,200"], ["Installation labor", "$3,400"]] as const;
  return (
    <div className="bg-background">
      <PreviewHeader
        eyebrow="Quote Q-1042"
        title="Kitchen remodel"
        action={<span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[0.6rem] font-semibold text-primary-foreground"><Sparkles className="size-3" /> Generate with AI</span>}
      />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/35 px-3 py-2">
          <div><p className="text-[0.58rem] uppercase tracking-[0.12em] text-muted-foreground">Prepared for</p><p className="text-[0.7rem] font-medium text-foreground">Sarah Jenkins</p></div>
          <span className="text-[0.6rem] text-muted-foreground">Valid until Sep 4</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/25 px-3 py-2"><span className="text-[0.58rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">Line items</span><span className="text-[0.6rem] font-medium text-primary">+ Add item</span></div>
          {items.map(([item, price]) => <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5 last:border-0" key={item}><span className="size-1.5 rounded-full bg-primary" /><span className="flex-1 text-[0.68rem] font-medium text-foreground">{item}</span><span className="text-[0.68rem] font-semibold text-foreground">{price}</span></div>)}
        </div>
        <div className="ml-auto grid w-48 grid-cols-2 gap-y-1.5 text-[0.65rem]"><span className="text-muted-foreground">Subtotal</span><span className="text-right text-foreground">$7,000</span><span className="text-muted-foreground">Tax (8%)</span><span className="text-right text-foreground">$560</span><span className="border-t border-border pt-1.5 font-semibold text-foreground">Total</span><span className="border-t border-border pt-1.5 text-right font-semibold text-foreground">$7,560</span></div>
      </div>
    </div>
  );
}

function AIChatPreviewMock() {
  return (
    <div className="bg-background">
      <PreviewHeader eyebrow="Assistant" title="Ask Requo anything" action={<Bot className="size-4 text-primary" />} />
      <div className="flex flex-col gap-3 p-4">
        <div className="self-end rounded-xl rounded-br-sm bg-primary px-3 py-2.5 text-[0.7rem] text-primary-foreground">Which quotes need a follow-up?</div>
        <div className="max-w-[92%] rounded-xl rounded-bl-sm border border-border/60 bg-muted/25 p-3">
          <div className="flex items-center gap-1.5 text-[0.62rem] font-semibold text-foreground"><Sparkles className="size-3 text-primary" /> 3 quotes need attention</div>
          <div className="mt-2 flex flex-col gap-1.5">
            {["Kitchen remodel · viewed 4 days ago", "Deck rebuild · sent last week", "Flooring estimate · no response"].map((quote) => <div className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-2" key={quote}><FileText className="size-3 text-muted-foreground" /><span className="flex-1 text-[0.62rem] text-foreground">{quote}</span><ArrowRight className="size-3 text-primary" /></div>)}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-[0.65rem] text-muted-foreground"><span className="flex-1">Ask about your pipeline…</span><span className="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground"><Send className="size-3" /></span></div>
      </div>
    </div>
  );
}

function AutomationPreviewMock() {
  return (
    <div className="bg-background">
      <PreviewHeader
        eyebrow="Workflow builder"
        title="Follow up after quote sent"
        action={<span className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2 py-1 text-[0.58rem] font-medium text-muted-foreground"><MoreHorizontal className="size-3" /> Options</span>}
      />
      <div className="relative min-h-[18rem] bg-[radial-gradient(circle,var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] p-4">
        <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1 rounded-lg border border-border/60 bg-card p-1 shadow-sm">
          {[Inbox, Clock3, Workflow].map((Icon) => <span className="flex size-5 items-center justify-center rounded text-muted-foreground" key={Icon.displayName}><Icon className="size-3" /></span>)}
          <span className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground"><Check className="size-3" /></span>
        </div>
        <div className="relative mx-auto mt-10 flex w-56 flex-col items-center">
          <WorkflowNode icon={Send} kind="Trigger" label="Quote sent" tone="primary" />
          <Connector label="Wait 3 days" />
          <WorkflowNode icon={Clock3} kind="Delay" label="Wait 3 days" tone="muted" />
          <Connector />
          <WorkflowNode icon={Mail} kind="Action" label="Send follow-up email" tone="action" />
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1 shadow-sm"><span className="size-4 rounded bg-muted" /><span className="size-4 rounded border border-primary bg-primary/10" /></div>
      </div>
    </div>
  );
}

function WorkflowNode({ icon: Icon, kind, label, tone }: { icon: typeof Send; kind: "Trigger" | "Delay" | "Action"; label: string; tone: "primary" | "muted" | "action" }) {
  const classes = tone === "primary" ? "bg-primary/10 text-primary" : tone === "action" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";
  return <div className="w-full rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2.5 text-[0.56rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><span className={cn("flex size-4 items-center justify-center rounded", classes)}><Icon className="size-2.5" /></span>{kind}</div><div className="flex items-center gap-2.5 border-t border-border/50 px-3 py-2.5"><span className={cn("flex size-7 items-center justify-center rounded-md", classes)}><Icon className="size-3.5" /></span><span className="text-[0.7rem] font-medium text-foreground">{label}</span></div></div>;
}

function Connector({ label }: { label?: string }) {
  return <div className="flex flex-col items-center py-1"><span className="h-3 border-l border-dashed border-primary/60" />{label ? <span className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[0.52rem] text-muted-foreground">{label}</span> : null}<span className="h-3 border-l border-dashed border-primary/60" /></div>;
}

function AnalyticsPreviewMock() {
  const bars = [45, 68, 53, 82, 74, 96, 88];
  return <div className="bg-background"><PreviewHeader eyebrow="Analytics" title="Pipeline performance" action={<span className="rounded-lg border border-border/60 px-2 py-1 text-[0.58rem] text-muted-foreground">Last 30 days</span>} /><div className="flex flex-col gap-3 p-4"><div className="grid grid-cols-3 gap-2">{[["Inquiries", "24"], ["Quotes sent", "16"], ["Won", "9"]].map(([label, value]) => <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5" key={label}><p className="text-[0.56rem] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tracking-tight text-foreground">{value}</p></div>)}</div><div className="rounded-xl border border-border/60 p-3"><div className="flex items-center justify-between"><div><p className="text-[0.68rem] font-medium text-foreground">Quote views</p><p className="text-[0.58rem] text-muted-foreground">Up 18% from last month</p></div><TrendingUp className="size-4 text-primary" /></div><div className="mt-4 flex h-20 items-end gap-2">{bars.map((height, index) => <span className="flex-1 rounded-t-sm bg-primary/15" key={index} style={{ height: `${height}%` }}><span className="block size-full rounded-t-sm bg-primary" style={{ height: index === 5 ? "100%" : "60%" }} /></span>)}</div></div><div className="flex items-center gap-2 rounded-lg bg-primary/[0.06] px-3 py-2.5"><TrendingUp className="size-3.5 text-primary" /><p className="text-[0.62rem] text-foreground"><span className="font-semibold">Best conversion:</span> Quotes sent within 1 hour.</p></div></div></div>;
}
