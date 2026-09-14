import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { HelpTooltip } from "@/components/shared/help-tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsDeltaPill } from "@/features/analytics/components/analytics-delta-pill";
import type { PeriodDeltaDirection } from "@/features/analytics/types";
import { cn } from "@/lib/utils";

/**
 * Hero KPI stat. Defaults to the shelled card used by the Advanced panels;
 * `variant="flat"` renders a borderless stat block for the flattened
 * overview (no shells, structure from spacing and typography only).
 */
export function AnalyticsKpiCard({
  icon: Icon,
  title,
  value,
  delta,
  description,
  tooltip,
  lockedBadge,
  className,
  children,
  variant = "card",
  valueClassName,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  delta?: { label: string; direction: PeriodDeltaDirection; inverted?: boolean } | null;
  description?: ReactNode;
  tooltip?: string;
  /** Rendered next to the title when the metric is plan-gated (e.g. "Pro"). */
  lockedBadge?: ReactNode;
  className?: string;
  children?: ReactNode;
  variant?: "card" | "flat";
  valueClassName?: string;
}) {
  if (variant === "flat") {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1", className)}>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{title}</span>
          {tooltip ? <HelpTooltip content={tooltip} label={title} /> : null}
          {lockedBadge}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-2xl font-semibold tracking-tight text-foreground tabular-nums", valueClassName)}>
            {value}
          </span>
          {delta ? <AnalyticsDeltaPill {...delta} /> : null}
        </p>
        {description ? (
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
    );
  }

  return (
    <Card className={cn("gap-0 border-border/60 bg-muted/40 shadow-none", className)}>
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex size-7 items-center justify-center rounded-lg border border-border/70 bg-card text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <p className="meta-label">{title}</p>
          {tooltip ? <HelpTooltip content={tooltip} label={title} /> : null}
          {lockedBadge}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={cn("text-xl font-semibold tracking-tight text-foreground tabular-nums", valueClassName)}>
            {value}
          </p>
          {delta ? <AnalyticsDeltaPill {...delta} /> : null}
        </div>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
