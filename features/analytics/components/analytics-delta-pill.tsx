import { cn } from "@/lib/utils";
import type { PeriodDeltaDirection } from "@/features/analytics/types";
import { getDeltaSentiment } from "@/features/analytics/utils";

/**
 * Compact period-over-period pill used by the overview hero cards.
 *
 * Mirrors the reference layout (`+8.4%` lime / `−3.1%` rose) with semantic
 * tokens: `success` for positive, `destructive` for negative, muted for flat.
 * Set `inverted` for "lower is better" metrics (e.g. overdue follow-ups).
 */
export function AnalyticsDeltaPill({
  label,
  direction,
  inverted = false,
  className,
}: {
  label: string;
  direction: PeriodDeltaDirection;
  inverted?: boolean;
  className?: string;
}) {
  const sentiment = getDeltaSentiment(direction, inverted);

  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-xs font-medium tabular-nums",
        sentiment === "positive" && "bg-success/12 text-success",
        sentiment === "negative" && "bg-destructive/10 text-destructive",
        sentiment === "neutral" && "bg-muted text-muted-foreground",
        className,
      )}
      aria-label={`Change versus prior period: ${label}`}
    >
      {direction === "up" ? "▲" : direction === "down" ? "▼" : "—"}&nbsp;{label}
    </span>
  );
}
