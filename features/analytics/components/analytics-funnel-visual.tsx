import type { FunnelStep } from "@/features/analytics/types";
import { formatPercent } from "@/features/analytics/utils";
import { cn } from "@/lib/utils";

/**
 * Horizontal segmented funnel matching the reference overview card: stages
 * flow left → right with widths proportional to each count, a `%`-of-first
 * pill centered on every stage after the first, and legend tiles below.
 *
 * Segment fills ride the `chart-*` tokens so dark mode follows the theme.
 */
const SEGMENT_FILLS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
] as const;

export function AnalyticsFunnelVisual({ steps }: { steps: FunnelStep[] }) {
  const firstCount = steps[0]?.count ?? 0;
  const total = steps.reduce((sum, s) => sum + s.count, 0);

  if (steps.length === 0 || total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No funnel activity yet — stages will appear here as visitors submit inquiries.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex h-16 items-stretch gap-1 sm:h-20"
        role="img"
        aria-label={`Funnel: ${steps.map((s) => `${s.label} ${s.count.toLocaleString()}`).join(", ")}`}
      >
        {steps.map((step, i) => {
          const share = firstCount > 0 ? step.count / firstCount : 0;
          // Keep small stages visible while preserving proportion.
          const widthPct = Math.max(share * 100, step.count > 0 ? 7 : 0);
          return (
            <div
              key={step.label}
              className={cn(
                "relative flex min-w-0 items-center justify-center overflow-hidden",
                SEGMENT_FILLS[i % SEGMENT_FILLS.length],
                i === 0 && "rounded-l-xl",
                i === steps.length - 1 && "rounded-r-xl",
              )}
              style={{ width: `${widthPct}%` }}
              title={`${step.label}: ${step.count.toLocaleString()} (${formatPercent(share)})`}
            >
              <span className="rounded-full bg-card/95 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground shadow-sm">
                {formatPercent(share)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {steps.map((step, i) => (
          <div key={step.label} className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                SEGMENT_FILLS[i % SEGMENT_FILLS.length],
              )}
              aria-hidden="true"
            />
            <span className="truncate text-xs text-muted-foreground">{step.label}</span>
            <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {step.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
