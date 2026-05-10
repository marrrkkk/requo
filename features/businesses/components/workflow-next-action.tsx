import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  WorkflowNextAction,
  WorkflowNextActionPriority,
} from "@/features/businesses/workflow-next-actions";
import { cn } from "@/lib/utils";

type WorkflowNextActionCalloutProps = {
  action: WorkflowNextAction | null;
  className?: string;
};

export function WorkflowNextActionCallout({
  action,
  className,
}: WorkflowNextActionCalloutProps) {
  if (!action) {
    return null;
  }

  return (
    <div
      className={cn(
        "alert-surface flex flex-col gap-4 rounded-xl border border-primary/12 px-4 py-4 text-sm text-foreground sm:flex-row sm:items-start sm:justify-between sm:px-5",
        className,
      )}
      role="status"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="meta-label">Next action</p>
          <Badge variant={getPriorityBadgeVariant(action.priority)}>
            {action.badgeLabel}
          </Badge>
        </div>
        <p className="mt-2 font-heading text-[0.98rem] font-semibold leading-6 tracking-tight text-foreground">
          {action.label}
        </p>
        <p className="mt-1 max-w-3xl leading-6 text-muted-foreground">
          {action.description}
        </p>
      </div>
      <Button asChild className="w-full sm:w-auto" size="sm">
        <Link href={action.href} prefetch={true}>
          {action.ctaLabel}
          <ArrowRight data-icon="inline-end" />
        </Link>
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

function getPriorityBadgeVariant(priority: WorkflowNextActionPriority) {
  return priority === "high" ? "secondary" : "outline";
}
