"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  WorkflowNextAction,
  WorkflowNextActionPriority,
} from "@/features/businesses/workflow-next-actions";
import { cn } from "@/lib/utils";

function getPriorityStyles(priority: WorkflowNextActionPriority) {
  switch (priority) {
    case "high":
      return "border-red-500/20 bg-red-500/5 dark:border-red-500/15 dark:bg-red-500/5";
    case "medium":
      return "border-amber-500/20 bg-amber-500/5 dark:border-amber-500/15 dark:bg-amber-500/5";
    case "low":
      return "border-primary/12 bg-primary/3 dark:border-primary/10 dark:bg-primary/3";
  }
}

type WorkflowNextActionCalloutProps = {
  action: WorkflowNextAction | null;
  className?: string;
};

export function WorkflowNextActionCallout({
  action,
  className,
}: WorkflowNextActionCalloutProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!action || isDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded-xl border px-4 py-4 pr-12 text-sm text-foreground sm:px-5 sm:pr-14",
        getPriorityStyles(action.priority),
        className,
      )}
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="font-heading text-[0.98rem] font-semibold leading-6 tracking-tight text-foreground">
          {action.label}
        </p>
        <p className="mt-1 max-w-3xl leading-6 text-muted-foreground">
          {action.description}
        </p>
      </div>

      <Button
        aria-label="Dismiss next action"
        className="absolute right-2 top-2"
        onClick={() => setIsDismissed(true)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X className="size-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  );
}

type WorkflowNextActionSummaryProps = {
  action: WorkflowNextAction | null;
  className?: string;
};

export function WorkflowNextActionSummary({
  action,
  className,
}: WorkflowNextActionSummaryProps) {
  if (!action) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-2 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs leading-none",
        "bg-[var(--surface-muted-bg)] text-foreground shadow-[var(--surface-shadow-sm)]",
        className,
      )}
    >
      <span className="meta-label shrink-0 text-[0.62rem] tracking-[0.12em]">
        Next
      </span>
      <span className="truncate font-medium">{action.label}</span>
    </span>
  );
}
