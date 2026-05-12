"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type TourStep = {
  selector: string;
  title: string;
  description: string;
  side: "right" | "bottom" | "top" | "left";
};

/* -------------------------------------------------------------------------- */
/*  Spotlight overlay                                                         */
/* -------------------------------------------------------------------------- */

function SpotlightOverlay({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;

  const pad = 6;
  const radius = 8; // Border radius for the highlight

  return (
    <>
      {/* Background Mask */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[9998] transition-[clip-path] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          backgroundColor: "rgba(0,0,0,0.45)",
          clipPath: `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%,
            0% 0%,
            ${rect.left - pad}px ${rect.top - pad}px,
            ${rect.left - pad}px ${rect.bottom + pad}px,
            ${rect.right + pad}px ${rect.bottom + pad}px,
            ${rect.right + pad}px ${rect.top - pad}px,
            ${rect.left - pad}px ${rect.top - pad}px
          )`,
        }}
      />
      {/* Highlight Box / Ring — pulses to draw attention */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-[9998] animate-[tour-spotlight-pulse_2s_ease-in-out_infinite] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          borderRadius: radius,
          boxShadow: "0 0 0 2px hsl(var(--primary)), 0 0 15px hsl(var(--primary)/0.25)",
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tooltip callout                                                           */
/* -------------------------------------------------------------------------- */

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  rect,
  onNext,
  onSkip,
  isPending,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  rect: DOMRect;
  onNext: () => void;
  onSkip: () => void;
  isPending: boolean;
}) {
  const isLast = stepIndex === totalSteps - 1;
  const tooltipRef = useRef<HTMLDivElement>(null);

  const pad = 16;
  let top = 0;
  let left = 0;

  if (step.side === "right") {
    top = rect.top + rect.height / 2;
    left = rect.right + pad;
  } else if (step.side === "bottom") {
    top = rect.bottom + pad;
    left = rect.left + rect.width / 2;
  } else if (step.side === "left") {
    top = rect.top + rect.height / 2;
    left = rect.left - pad;
  } else if (step.side === "top") {
    top = rect.top - pad;
    left = rect.left + rect.width / 2;
  }

  return (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[9999] flex w-80 flex-col gap-4 rounded-xl border border-border/80 bg-popover p-5 shadow-xl ring-1 ring-foreground/5",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        step.side === "right" && "-translate-y-1/2",
        step.side === "left" && "-translate-y-1/2 -translate-x-full",
        step.side === "bottom" && "-translate-x-1/2",
        step.side === "top" && "-translate-x-1/2 -translate-y-full",
      )}
      style={{ top, left }}
    >
      {/* Arrow */}
      <div
        aria-hidden
        className={cn(
          "absolute size-2.5 rotate-45 border bg-popover",
          step.side === "right" &&
            "-left-[6px] top-1/2 -translate-y-1/2 border-b-0 border-r-0 border-border/80",
          step.side === "left" &&
            "-right-[6px] top-1/2 -translate-y-1/2 border-t-0 border-l-0 border-border/80",
          step.side === "bottom" &&
            "-top-[6px] left-1/2 -translate-x-1/2 border-b-0 border-r-0 border-border/80",
          step.side === "top" &&
            "-bottom-[6px] left-1/2 -translate-x-1/2 border-t-0 border-l-0 border-border/80",
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="meta-label">
            Step {stepIndex + 1} of {totalSteps}
          </p>
          <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
            {step.title}
          </h3>
        </div>
        <button
          aria-label="Close tour"
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onSkip}
          type="button"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">
        {step.description}
      </p>

      <div className="flex items-center justify-between gap-3">
        <Button
          disabled={isPending}
          onClick={onSkip}
          size="sm"
          type="button"
          variant="ghost"
        >
          Skip tour
        </Button>
        <Button
          disabled={isPending}
          onClick={onNext}
          size="sm"
          type="button"
        >
          {isLast ? "Done" : "Next"}
        </Button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            aria-hidden
            className={cn(
              "size-1.5 rounded-full transition-colors duration-200",
              i === stepIndex ? "bg-primary" : "bg-border",
              i < stepIndex && "bg-primary/40",
            )}
            key={i}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main tour component                                                       */
/* -------------------------------------------------------------------------- */

type GuidedTourProps = {
  show: boolean;
  steps: TourStep[];
  onComplete: () => Promise<void>;
  /** localStorage key for client-side dismissal. When set, tour auto-hides if key exists. */
  storageKey?: string;
};

export function GuidedTour({ show, steps, onComplete, storageKey }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [active, setActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isPending, startTransition] = useTransition();

  // Delay start to let the page render
  useEffect(() => {
    if (!show) return;

    // Skip on mobile viewports
    const mq = window.matchMedia("(min-width: 768px)");
    if (!mq.matches) return;

    // Skip if already completed for this storageKey
    if (storageKey) {
      try {
        if (localStorage.getItem(storageKey)) return;
      } catch {
        // localStorage unavailable — show tour anyway
      }
    }

    const timer = window.setTimeout(() => setActive(true), 800);
    return () => window.clearTimeout(timer);
  }, [show, storageKey]);

  useEffect(() => {
    if (!active) return;

    let rafId: number;

    function updateRect() {
      const step = steps[currentStep];
      if (!step) return;

      const el = document.querySelector(step.selector);

      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect((prev) => {
          if (
            prev &&
            prev.top === rect.top &&
            prev.left === rect.left &&
            prev.width === rect.width &&
            prev.height === rect.height
          ) {
            return prev;
          }
          return rect;
        });

        // Scroll into view if needed
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      rafId = requestAnimationFrame(updateRect);
    }

    rafId = requestAnimationFrame(updateRect);

    return () => cancelAnimationFrame(rafId);
  }, [active, currentStep, steps]);

  const completeTour = useCallback(() => {
    setActive(false);
    // Persist dismissal in localStorage for per-business tracking
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, new Date().toISOString());
      } catch {
        // localStorage unavailable — tour won't persist but still dismisses
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

  // Keyboard: Escape to skip, Enter/Right to advance
  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        completeTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, handleNext, completeTour]);

  if (!active || !targetRect) return null;

  const step = steps[currentStep];
  if (!step) return null;

  return (
    <>
      <SpotlightOverlay rect={targetRect} />
      <TourTooltip
        isPending={isPending}
        onNext={handleNext}
        onSkip={completeTour}
        rect={targetRect}
        step={step}
        stepIndex={currentStep}
        totalSteps={steps.length}
      />
    </>
  );
}
