"use client";

import type { BusinessPlan } from "@/lib/plans";
import { getUpgradeCtaLabel } from "@/lib/plans";
import { cn } from "@/lib/utils";

type UsageLimitBannerProps = {
  /** Human-readable label for the limit */
  label: string;
  /** Current usage count */
  current: number;
  /** Maximum allowed by plan */
  limit: number;
  /** Current business plan */
  plan: BusinessPlan;
  /** Additional className */
  className?: string;
};

/**
 * UsageLimitBanner — inline banner showing monthly usage progress.
 *
 * Displays a progress bar with current/limit counts and at-limit messaging.
 * Uses the unified paywall visual language (border-border/70, bg-card/50, rounded-xl).
 *
 * @see .kiro/specs/paywall-ui-system/design.md
 */
export function UsageLimitBanner({
  label,
  current,
  limit,
  plan,
  className,
}: UsageLimitBannerProps) {
  const percentage = Math.min(100, Math.round((current / limit) * 100));
  const isAtLimit = current >= limit;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3.5",
        isAtLimit
          ? "border-destructive/30 bg-destructive/5"
          : "border-border/70 bg-card/50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span className="text-sm tabular-nums text-muted-foreground">
          {current} / {limit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
        <div
          className={cn(
            "h-full rounded-full transition-all motion-reduce:transition-none",
            isAtLimit ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isAtLimit ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          You&apos;ve reached this business plan limit.{" "}
          {getUpgradeCtaLabel(plan)} for unlimited usage.
        </p>
      ) : null}
    </div>
  );
}
