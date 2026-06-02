"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BellRing,
  Briefcase,
  Check,
  Eye,
  FileText,
  Inbox,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_DURATION = 8000;
const STEP_COUNT = 4;

const workflowSteps = [
  {
    title: "Capture",
    subtitle: "A request comes in",
    description:
      "Customer fills out your form or you log it from a call. Name, details, what they need — all in one place.",
    icon: Inbox,
  },
  {
    title: "Quote",
    subtitle: "You send a quote same day",
    description:
      "AI writes the first draft using your prices. You tweak it, approve it, send it. Takes minutes.",
    icon: FileText,
  },
  {
    title: "Win",
    subtitle: "They accept, you know right away",
    description:
      "You'll see when they open it. Follow-ups go out on autopilot. The moment they say yes, it's in your dashboard.",
    icon: BellRing,
  },
  {
    title: "Deliver",
    subtitle: "Job done, invoice sent",
    description:
      "Accepted quote turns into a job. When you finish, invoice pulls from the same line items. One click.",
    icon: Briefcase,
  },
] as const;

// ─── Artifact Previews ──────────────────────────────────────────────────────

function CaptureArtifact() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Inbox className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Sarah Jenkins</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Kitchen remodel · Full gut + new cabinetry
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          New
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/50 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
          <Inbox className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">Marcus Chen</p>
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            Bathroom renovation · Yesterday
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          Replied
        </span>
      </div>
    </div>
  );
}

function QuoteArtifact() {
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Kitchen remodel</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">Q-1042 · Sarah Jenkins</p>
        </div>
        <p className="shrink-0 font-heading text-lg font-semibold text-foreground">$4,850</p>
      </div>
      <div className="px-4 py-3">
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Cabinet demolition & removal</span>
            <span className="font-medium text-foreground">$1,200</span>
          </div>
          <div className="flex justify-between">
            <span>Custom cabinetry install</span>
            <span className="font-medium text-foreground">$2,800</span>
          </div>
          <div className="flex justify-between">
            <span>Countertop + backsplash</span>
            <span className="font-medium text-foreground">$850</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary/60" />
          AI drafted
        </span>
        <span className="text-[11px] text-muted-foreground/50">·</span>
        <span className="text-[11px] text-muted-foreground">Valid 30 days</span>
      </div>
    </div>
  );
}

function WinArtifact() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
        <p className="mb-2.5 text-xs font-medium text-muted-foreground">Quote Q-1042 · Sarah Jenkins</p>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Eye className="size-3" />
            Viewed 2h ago
          </span>
          <ArrowRight className="size-3.5 text-muted-foreground/40" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Check className="size-3" />
            Accepted
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-background/50 px-4 py-2.5">
        <BellRing className="size-3.5 text-muted-foreground/60" />
        <span className="text-[11px] text-muted-foreground">Follow-up sent automatically · 3 days ago</span>
      </div>
    </div>
  );
}

function DeliverArtifact() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Briefcase className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Job created</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">In progress</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Kitchen remodel · Sarah Jenkins · From Q-1042</p>
      </div>
      <div className="rounded-xl border border-border/40 bg-background/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Invoice #INV-087</span>
          </div>
          <span className="text-sm font-medium text-foreground">$4,850</span>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground/70">Generated from job line items · Sent</p>
      </div>
    </div>
  );
}

const artifacts = [CaptureArtifact, QuoteArtifact, WinArtifact, DeliverArtifact];

// ─── Main Component ─────────────────────────────────────────────────────────

export function WorkflowStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const isPausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const advanceStep = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % STEP_COUNT);
    setProgress(0);
    elapsedRef.current = 0;
  }, []);

  useEffect(() => {
    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      if (!isPausedRef.current) {
        const delta = now - lastTickRef.current;
        elapsedRef.current += delta;

        const pct = Math.min(elapsedRef.current / STEP_DURATION, 1);
        setProgress(pct);

        if (pct >= 1) {
          advanceStep();
          lastTickRef.current = now;
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      lastTickRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeStep, advanceStep]);

  const handleStepClick = (index: number) => {
    // Always restart progress from 0, even if clicking the current step
    elapsedRef.current = 0;
    lastTickRef.current = performance.now();
    setProgress(0);
    if (index === activeStep) {
      // Force re-render by toggling a tick
      setProgress(0.001);
      requestAnimationFrame(() => setProgress(0));
    } else {
      setActiveStep(index);
    }
  };

  const handleMouseEnter = () => {
    isPausedRef.current = true;
  };

  const handleMouseLeave = () => {
    isPausedRef.current = false;
    lastTickRef.current = performance.now();
  };

  const ActiveArtifact = artifacts[activeStep];
  const activeData = workflowSteps[activeStep];
  const ActiveIcon = activeData.icon;

  return (
    <div
      className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14 xl:gap-20"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Left: Steps list */}
      <div className="flex flex-col gap-1">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === activeStep;

          return (
            <button
              key={step.title}
              type="button"
              onClick={() => handleStepClick(index)}
              className="group/step relative flex items-start gap-4 rounded-xl px-4 py-5 text-left transition-colors hover:bg-muted/30 sm:gap-5 sm:px-5 sm:py-6"
            >
              {/* Left border progress indicator — only active step shows filling bar */}
              <div className="absolute left-0 top-3 bottom-3 w-[3px] overflow-hidden rounded-full sm:top-4 sm:bottom-4">
                {isActive ? (
                  <div className="h-full w-full rounded-full bg-border/40">
                    <div
                      className="w-full rounded-full bg-primary transition-none"
                      style={{ height: `${progress * 100}%` }}
                    />
                  </div>
                ) : (
                  <div className="h-full w-full rounded-full bg-transparent" />
                )}
              </div>

              {/* Icon */}
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/40 text-muted-foreground group-hover/step:bg-muted/60"
                )}
              >
                <Icon className="size-[1.125rem]" />
              </span>

              {/* Text */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1.5">
                <h3
                  className={cn(
                    "font-heading text-[0.95rem] font-semibold tracking-tight sm:text-base",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover/step:text-foreground/70"
                  )}
                >
                  {step.subtitle}
                </h3>
                {isActive && (
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Right: Artifact preview */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/50 p-5 sm:p-7 lg:sticky lg:top-32 lg:p-8">
        {/* Step label */}
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ActiveIcon className="size-4" />
          </span>
          <span className="meta-label text-primary">{activeData.title}</span>
        </div>

        {/* Artifact */}
        <div className="min-h-[12rem]">
          <ActiveArtifact />
        </div>

        {/* Background glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -right-12 size-44 rounded-full bg-primary/[0.03] blur-3xl"
        />
      </div>
    </div>
  );
}
