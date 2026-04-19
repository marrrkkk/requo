"use client";

import { Check } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type OnboardingStepperItem = {
  id: string;
  label: string;
  description: string;
};

type OnboardingStepperProps = {
  items: readonly OnboardingStepperItem[];
  currentStep: number;
  onStepSelect: (stepIndex: number) => void;
};

export function OnboardingStepper({
  items,
  currentStep,
  onStepSelect,
}: OnboardingStepperProps) {
  const progressValue = ((currentStep + 1) / items.length) * 100;

  return (
    <nav aria-label="Onboarding progress" className="flex flex-col gap-4">
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          const isInteractive = isCompleted;

          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  isCompleted &&
                    "border-primary/20 bg-primary text-primary-foreground",
                  isCurrent &&
                    "border-primary/30 bg-primary/[0.08] text-primary shadow-[var(--surface-shadow-sm)]",
                  isUpcoming && "border-border bg-background text-muted-foreground",
                )}
              >
                {isCompleted ? <Check /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {item.label}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </>
          );

          return (
            <li key={item.id}>
              {isInteractive ? (
                <button
                  className={cn(
                    "soft-panel flex w-full items-start gap-3 px-4 py-4 text-left transition-colors",
                    "hover:border-foreground/15 hover:bg-accent/40",
                    isCurrent && "border-primary/20 bg-primary/[0.05]",
                    isUpcoming && "opacity-80",
                  )}
                  onClick={() => onStepSelect(index)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "soft-panel flex items-start gap-3 px-4 py-4",
                    isCurrent && "border-primary/20 bg-primary/[0.05]",
                    isUpcoming && "opacity-80",
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3">
        <Progress aria-hidden="true" className="flex-1" value={progressValue} />
        <p className="shrink-0 text-sm text-muted-foreground">
          Step {currentStep + 1} of {items.length}
        </p>
      </div>
    </nav>
  );
}
