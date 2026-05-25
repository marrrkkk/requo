"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  ClipboardList,
  FileText,
  FormInput,
  Home,
  Inbox,
  Receipt,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type TourModalStep = {
  title: string;
  description: string;
  preview: React.ReactNode;
};

type TourModalProps = {
  show: boolean;
  steps: TourModalStep[];
  onComplete: () => Promise<void>;
  /** localStorage key for client-side dismissal. */
  storageKey?: string;
  /** When true, never auto-open (server says tour already completed). */
  completed?: boolean;
  /** Bump to force-open for dev preview (ignores localStorage once). */
  replayToken?: number;
};

/* -------------------------------------------------------------------------- */
/*  Tour Modal                                                                */
/* -------------------------------------------------------------------------- */

export function TourModal({
  show,
  steps,
  onComplete,
  storageKey,
  completed = false,
  replayToken = 0,
}: TourModalProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!show || completed) {
      return;
    }

    // Skip on mobile viewports
    const mq = window.matchMedia("(min-width: 768px)");
    if (!mq.matches) {
      return;
    }

    const isReplay = replayToken > 0;

    if (!isReplay && storageKey) {
      try {
        if (localStorage.getItem(storageKey)) {
          return;
        }
      } catch {
        // localStorage unavailable — show tour anyway
      }
    }

    setCurrentStep(0);
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [show, completed, storageKey, replayToken]);

  const completeTour = useCallback(() => {
    setOpen(false);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, new Date().toISOString());
      } catch {
        // localStorage unavailable
      }
    }
    startTransition(async () => {
      try {
        await onComplete();
      } catch {
        // Silently fail — tour still dismissed locally
      }
    });
  }, [onComplete, storageKey]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  }, [currentStep, completeTour, steps.length]);

  const step = steps[currentStep];
  if (!step) return null;

  const isLast = currentStep === steps.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) completeTour();
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="meta-label">
                Step {currentStep + 1} of {steps.length}
              </p>
              <DialogTitle>{step.title}</DialogTitle>
            </div>
          </div>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        {/* Preview area */}
        <div className="my-2 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
          <div className="p-4">
            {step.preview}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {steps.map((_, i) => (
            <button
              aria-label={`Go to step ${i + 1}`}
              className={cn(
                "size-2 rounded-full transition-all duration-200",
                i === currentStep
                  ? "scale-125 bg-primary"
                  : i < currentStep
                    ? "bg-primary/40"
                    : "bg-border",
              )}
              key={i}
              onClick={() => setCurrentStep(i)}
              type="button"
            />
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
          <Button
            disabled={isPending}
            onClick={completeTour}
            size="sm"
            type="button"
            variant="ghost"
          >
            Skip tour
          </Button>
          <Button
            disabled={isPending}
            onClick={handleNext}
            size="sm"
            type="button"
          >
            {isLast ? "Get started" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Preview components for dashboard tour                                     */
/* -------------------------------------------------------------------------- */

function PreviewNavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px]",
        active
          ? "border border-primary/12 bg-primary/10 font-medium text-primary"
          : "text-muted-foreground",
      )}
    >
      <Icon className={cn("size-3.5", active && "text-primary")} />
      <span>{label}</span>
    </div>
  );
}

function PreviewSidebar({ highlight }: { highlight?: string }) {
  const items = [
    { icon: Home, label: "Home" },
    { icon: Inbox, label: "Inquiries" },
    { icon: FileText, label: "Quotes" },
    { icon: BellRing, label: "Follow-ups" },
    { icon: ClipboardList, label: "Jobs" },
    { icon: Receipt, label: "Invoices" },
    { icon: Workflow, label: "Automations" },
    { icon: FormInput, label: "Forms" },
    { icon: BarChart3, label: "Analytics" },
  ];

  return (
    <div className="flex w-[7.5rem] shrink-0 flex-col gap-0.5 rounded-lg border border-border/50 bg-background p-1.5">
      <div className="mb-1.5 flex items-center gap-2 rounded-md border border-border/40 px-2 py-1.5">
        <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-[8px] font-bold text-primary">
          AB
        </div>
        <div className="min-w-0">
          <p className="truncate text-[9px] font-medium text-foreground">Acme Business</p>
        </div>
      </div>
      {items.map((item) => (
        <PreviewNavItem
          active={item.label === highlight}
          icon={item.icon}
          key={item.label}
          label={item.label}
        />
      ))}
    </div>
  );
}

function PreviewAttentionRow({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "urgent" | "normal" | "positive";
}) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          tone === "urgent" && "bg-destructive/10 text-destructive",
          tone === "normal" && "bg-primary/10 text-primary",
          tone === "positive" && "bg-green-500/10 text-green-600 dark:text-green-400",
        )}
      >
        <Icon className="size-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-foreground">{title}</p>
        <p className="truncate text-[10px] text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="size-3 shrink-0 text-muted-foreground/50" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Exported preview scenes                                                   */
/* -------------------------------------------------------------------------- */

export function HomeOverviewPreview() {
  return (
    <div className="flex gap-3">
      <PreviewSidebar highlight="Home" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="rounded-lg border border-border/50 bg-background p-2.5">
          <p className="text-[11px] font-semibold text-foreground">Welcome back, Alex</p>
          <p className="text-[10px] text-muted-foreground">3 items need attention today.</p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            <span className="text-[10px] text-muted-foreground">
              Ask Requo to draft a follow-up or summarize an inquiry…
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-background p-3">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">NEEDS ATTENTION</p>
          <p className="mt-0.5 text-[9px] text-muted-foreground">Quotes and inquiries waiting on the next step.</p>
          <div className="mt-2 flex flex-col divide-y divide-border/50">
            <PreviewAttentionRow
              icon={FileText}
              title="Q-1042 viewed, no reply in 2 days"
              description="Sarah Jenkins · Kitchen remodel"
              tone="urgent"
            />
            <PreviewAttentionRow
              icon={BellRing}
              title="Follow-up due today"
              description="Maya Fields · Studio fit-out"
              tone="normal"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use {@link HomeOverviewPreview} */
export const BusinessSwitcherPreview = HomeOverviewPreview;

export function InquiriesPreview() {
  return (
    <div className="flex gap-3">
      <PreviewSidebar highlight="Inquiries" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="rounded-lg border border-border/50 bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-foreground">Inquiries</p>
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">3 new</span>
          </div>
          <div className="mt-2 flex flex-col divide-y divide-border/50">
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <Inbox className="size-3 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Sarah Jenkins</p>
                <p className="truncate text-[10px] text-muted-foreground">Kitchen remodel · 10:24 AM</p>
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-primary">New</span>
            </div>
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <Inbox className="size-3 text-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Leo Park</p>
                <p className="truncate text-[10px] text-muted-foreground">Tile repair · 9:02 AM</p>
              </div>
              <span className="rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">Qualified</span>
            </div>
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <Inbox className="size-3 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Maya Fields</p>
                <p className="truncate text-[10px] text-muted-foreground">Studio fit-out · Yesterday</p>
              </div>
              <span className="rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">Quoted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuotesPreview() {
  return (
    <div className="flex gap-3">
      <PreviewSidebar highlight="Quotes" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="rounded-lg border border-border/50 bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-foreground">Quotes</p>
          </div>
          <div className="mt-2 flex flex-col divide-y divide-border/50">
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <FileText className="size-3 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Kitchen remodel</p>
                <p className="truncate text-[10px] text-muted-foreground">Sarah Jenkins · $4,850</p>
              </div>
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Draft</span>
            </div>
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <FileText className="size-3 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Studio fit-out</p>
                <p className="truncate text-[10px] text-muted-foreground">Maya Fields · $12,200</p>
              </div>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Sent</span>
            </div>
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <FileText className="size-3 text-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Tile repair</p>
                <p className="truncate text-[10px] text-muted-foreground">Leo Park · $1,350</p>
              </div>
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[8px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Accepted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FollowUpsPreview() {
  return (
    <div className="flex gap-3">
      <PreviewSidebar highlight="Follow-ups" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="rounded-lg border border-border/50 bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-foreground">Follow-ups</p>
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">2 due</span>
          </div>
          <div className="mt-2 flex flex-col divide-y divide-border/50">
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <BellRing className="size-3 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Follow up on Q-1042</p>
                <p className="truncate text-[10px] text-muted-foreground">Sarah Jenkins · Viewed 2 days ago</p>
              </div>
              <span className="text-[9px] text-muted-foreground">Today</span>
            </div>
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <BellRing className="size-3 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Check in with Maya</p>
                <p className="truncate text-[10px] text-muted-foreground">Studio fit-out · Sent last week</p>
              </div>
              <span className="text-[9px] text-muted-foreground">Tomorrow</span>
            </div>
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <BellRing className="size-3 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Deposit reminder</p>
                <p className="truncate text-[10px] text-muted-foreground">Leo Park · Accepted</p>
              </div>
              <span className="text-[9px] text-muted-foreground">In 3 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobsPreview() {
  return (
    <div className="flex gap-3">
      <PreviewSidebar highlight="Jobs" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="rounded-lg border border-border/50 bg-background p-3">
          <p className="text-[11px] font-medium text-foreground">Jobs</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Turn accepted quotes into work you can track.
          </p>
          <div className="mt-2 flex flex-col divide-y divide-border/50">
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <ClipboardList className="size-3 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Kitchen remodel</p>
                <p className="truncate text-[10px] text-muted-foreground">Sarah Jenkins · In progress</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <ClipboardList className="size-3 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">Tile repair</p>
                <p className="truncate text-[10px] text-muted-foreground">Leo Park · Scheduled</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoicesPreview() {
  return (
    <div className="flex gap-3">
      <PreviewSidebar highlight="Invoices" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="rounded-lg border border-border/50 bg-background p-3">
          <p className="text-[11px] font-medium text-foreground">Invoices</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Bill for completed work and track payment status.
          </p>
          <div className="mt-2 flex flex-col divide-y divide-border/50">
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Receipt className="size-3 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">INV-1048</p>
                <p className="truncate text-[10px] text-muted-foreground">Studio fit-out · $12,200</p>
              </div>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-medium text-primary">Sent</span>
            </div>
            <div className="flex items-center gap-2.5 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Receipt className="size-3 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">INV-1042</p>
                <p className="truncate text-[10px] text-muted-foreground">Tile repair · $1,350</p>
              </div>
              <span className="rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">Paid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutomationsPreview() {
  return (
    <div className="flex gap-3">
      <PreviewSidebar highlight="Automations" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="rounded-lg border border-border/50 bg-background p-3">
          <p className="text-[11px] font-medium text-foreground">Automations</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Event-driven rules that run your follow-ups for you.
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="rounded-md border border-border/50 px-2.5 py-2">
              <p className="text-[10px] font-medium text-foreground">Quote viewed → follow up in 3 days</p>
              <p className="text-[9px] text-muted-foreground">Runs when a customer opens the link</p>
            </div>
            <div className="rounded-md border border-border/50 px-2.5 py-2">
              <p className="text-[10px] font-medium text-foreground">Quote accepted → create job</p>
              <p className="text-[9px] text-muted-foreground">Keeps delivery moving without manual steps</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormsPreview() {
  return (
    <div className="flex gap-3">
      <PreviewSidebar highlight="Forms" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="rounded-lg border border-border/50 bg-background p-3">
          <p className="text-[11px] font-medium text-foreground">Inquiry forms</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Customize fields, publish your page, and share one link.
          </p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2">
              <span className="text-[10px] font-medium text-foreground">Project request</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-medium text-primary">Live</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2">
              <span className="text-[10px] font-medium text-foreground">Quick quote</span>
              <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[8px] text-muted-foreground">Draft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
