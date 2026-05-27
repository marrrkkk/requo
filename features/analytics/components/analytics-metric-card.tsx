import type { LucideIcon } from "lucide-react";

import { HelpTooltip } from "@/components/shared/help-tooltip";
import { Card, CardContent } from "@/components/ui/card";
import type { PeriodDelta, PeriodDeltaDirection } from "@/features/analytics/types";

function DeltaBadge({
  label,
  direction,
  inverted,
}: {
  label: string;
  direction: PeriodDeltaDirection;
  inverted?: boolean;
}) {
  if (direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        — {label}
      </span>
    );
  }

  const isPositive = inverted ? direction === "down" : direction === "up";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${isPositive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-500 dark:text-red-400"
        }`}
    >
      {direction === "up" ? "▲" : "▼"} {label}
    </span>
  );
}

export function AnalyticsMetricCard({
  title,
  value,
  description,
  tooltip,
  icon: Icon,
  delta,
  sparkline,
}: {
  title: string;
  value: string;
  description?: string;
  tooltip?: string;
  icon: LucideIcon;
  delta?: { label: string; direction: PeriodDeltaDirection; inverted?: boolean } | null;
  sparkline?: React.ReactNode;
}) {
  return (
    <Card className="h-full border-border/75 bg-card/97" size="sm">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="meta-label">{title}</p>
              {tooltip ? <HelpTooltip content={tooltip} label={title} /> : null}
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            {delta ? (
              <div className="mt-1.5">
                <DeltaBadge {...delta} />
              </div>
            ) : null}
            {description ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-accent/85 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <Icon className="size-4 shrink-0" />
          </div>
        </div>
        {sparkline ? <div className="mt-auto pt-3">{sparkline}</div> : null}
      </CardContent>
    </Card>
  );
}
