"use client";

import { useState } from "react";
import { ArrowRight, BellRing, CheckCircle2, FileText, Inbox } from "lucide-react";
import Link from "next/link";

import { MarketingFeatureMock } from "@/components/marketing/marketing-feature-mocks";
import { cn } from "@/lib/utils";

const steps = [
  ["Capture", "Request comes in", "Customer fills out your form, or you add it from a call. Everything is captured in seconds.", Inbox],
  ["Quote", "Quote sent same day", "AI drafts line items from your pricing library. Review, adjust, and send in minutes.", FileText],
  ["Follow up", "Keep the opportunity moving", "Scheduled reminders keep the next step from being forgotten.", BellRing],
  ["Accepted", "Accepted and ready to move forward", "See accepted quotes instantly and keep the customer, scope, and pricing together for the next step.", CheckCircle2],
] as const;

function AcceptedPreview() {
  return (
    <div className="bg-background">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div><p className="text-[0.55rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">Quote Q-1042</p><p className="text-sm font-semibold">Kitchen remodel</p></div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[0.6rem] font-medium text-primary"><CheckCircle2 className="size-3" /> Accepted</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><CheckCircle2 className="size-4" /></span><div><p className="text-[0.72rem] font-semibold">Sarah accepted your quote</p><p className="text-[0.62rem] text-muted-foreground">Today at 10:42 AM</p></div></div></div>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-border/60 p-3"><p className="text-[0.58rem] text-muted-foreground">Quote total</p><p className="mt-1 text-lg font-semibold">$7,560</p></div><div className="rounded-xl border border-border/60 p-3"><p className="text-[0.58rem] text-muted-foreground">Status</p><p className="mt-1 text-[0.72rem] font-semibold text-primary">Accepted</p></div></div>
        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5"><span className="text-[0.65rem] text-muted-foreground">Customer and line items are ready</span><ArrowRight className="size-3.5 text-primary" /></div>
      </div>
    </div>
  );
}

function StepPreview({ active }: { active: number }) {
  if (active === 0) return <MarketingFeatureMock featureId="inquiries" />;
  if (active === 1) return <MarketingFeatureMock featureId="quotes" />;
  if (active === 2) return <MarketingFeatureMock featureId="followUps" />;
  return <AcceptedPreview />;
}

export function WorkflowTabs() {
  const [active, setActive] = useState(0);
  const [title, subtitle, description] = steps[active];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-4 border-b border-border" role="tablist" aria-label="How Requo works">
        {steps.map(([label, , , StepIcon], index) => (
          <button key={label} type="button" role="tab" aria-selected={index === active} onClick={() => setActive(index)} className={cn("relative flex min-w-0 items-center justify-center gap-2 px-2 py-3.5 text-xs font-medium sm:px-4 sm:py-4 sm:text-sm", index === active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <StepIcon className="size-4" /><span className="truncate">{label}</span>{index === active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" /> : null}
          </button>
        ))}
      </div>
      <div className="grid min-h-[24rem] lg:grid-cols-[1.05fr_1fr]" role="tabpanel">
        <div className="flex min-h-[19rem] items-center justify-center bg-muted/25 p-5 sm:p-8"><div className="w-full max-w-lg overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm"><StepPreview active={active} /></div></div>
        <div className="flex flex-col justify-center border-t border-border p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12"><p className="meta-label mb-4 text-primary">STEP 0{active + 1} / {title}</p><h3 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{subtitle}</h3><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">{description}</p><Link className="mt-7 inline-flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline" href="/signup">Start free <ArrowRight className="size-4" /></Link></div>
      </div>
    </div>
  );
}
