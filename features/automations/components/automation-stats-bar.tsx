"use client";

import { Activity, CheckCircle2, AlertTriangle, Zap } from "lucide-react";

import type { AutomationStats } from "../queries";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AutomationStatsBarProps = {
  stats: AutomationStats;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact stats bar shown at the top of the automations page when automations
 * exist. Gives owners a quick sense of automation health and activity.
 */
export function AutomationStatsBar({ stats }: AutomationStatsBarProps) {
  const successRate =
    stats.totalExecutions > 0
      ? Math.round((stats.successCount / stats.totalExecutions) * 100)
      : null;

  return (
    <div className="flex items-center gap-6 border-b border-border/60 px-6 py-3">
      <StatItem
        icon={Zap}
        label="Active"
        value={`${stats.activeCount} of ${stats.totalCount}`}
      />
      <div className="h-4 w-px bg-border" />
      <StatItem
        icon={Activity}
        label="Executions"
        value={stats.totalExecutions.toLocaleString()}
      />
      {successRate !== null && (
        <>
          <div className="h-4 w-px bg-border" />
          <StatItem
            icon={successRate >= 90 ? CheckCircle2 : AlertTriangle}
            label="Success rate"
            value={`${successRate}%`}
            tone={
              successRate >= 90
                ? "positive"
                : successRate >= 70
                  ? "neutral"
                  : "warning"
            }
          />
        </>
      )}
      {stats.failureCount > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          <StatItem
            icon={AlertTriangle}
            label="Failures"
            value={stats.failureCount.toLocaleString()}
            tone="warning"
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Item
// ---------------------------------------------------------------------------

function StatItem({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  tone?: "positive" | "neutral" | "warning";
}) {
  const toneClasses = {
    positive: "text-emerald-600",
    neutral: "text-foreground",
    warning: "text-amber-600",
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <div className="flex items-baseline gap-1.5">
        <span className={`text-sm font-medium ${toneClasses[tone]}`}>
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
