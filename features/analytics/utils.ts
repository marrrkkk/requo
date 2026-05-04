export function formatAnalyticsPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const analyticsDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function getTrendBarHeight(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return "12%";
  }

  const ratio = value / maxValue;

  return `${Math.max(12, Math.round(ratio * 100))}%`;
}

/**
 * Format a duration in hours into a human-readable string.
 * Returns null when the value is null (no data).
 */
export function formatAnalyticsDuration(hours: number | null): string | null {
  if (hours === null) {
    return null;
  }

  if (hours < 1) {
    const minutes = Math.round(hours * 60);

    return minutes <= 1 ? "< 1 min" : `${minutes} min`;
  }

  if (hours < 24) {
    const rounded = Math.round(hours * 10) / 10;

    return `${rounded}h`;
  }

  const days = Math.round((hours / 24) * 10) / 10;

  return `${days}d`;
}

/**
 * Format cents as a currency string for display in analytics cards.
 */
export function formatAnalyticsMoney(
  amountInCents: number,
  currency = "USD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
}

export function formatAnalyticsWeekRangeLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  if (
    weekStart.getUTCFullYear() === weekEnd.getUTCFullYear() &&
    weekStart.getUTCMonth() === weekEnd.getUTCMonth()
  ) {
    return `${analyticsDateFormatter.format(weekStart)}-${weekEnd.getUTCDate()}`;
  }

  return `${analyticsDateFormatter.format(weekStart)}-${analyticsDateFormatter.format(
    weekEnd,
  )}`;
}

import type { PeriodDelta, PeriodDeltaDirection } from "@/features/analytics/types";

/**
 * Compute direction and absolute change between current and prior period values.
 */
export function computeDelta(
  current: number,
  prior: number,
): PeriodDelta {
  const diff = current - prior;

  if (diff === 0 || (current === 0 && prior === 0)) {
    return { value: 0, direction: "flat" };
  }

  return {
    value: Math.abs(diff),
    direction: diff > 0 ? "up" : "down",
  };
}

/**
 * Compute delta for a duration metric (lower is better).
 * Returns null when both values are null.
 */
export function computeDurationDelta(
  current: number | null,
  prior: number | null,
): PeriodDelta | null {
  if (current === null && prior === null) {
    return null;
  }

  return computeDelta(current ?? 0, prior ?? 0);
}

/**
 * Format a count delta as a human-readable label.
 */
export function formatCountDelta(delta: PeriodDelta): string {
  if (delta.direction === "flat") {
    return "No change";
  }

  const prefix = delta.direction === "up" ? "+" : "−";

  return `${prefix}${delta.value}`;
}

/**
 * Format a duration delta showing the hours-based change.
 */
export function formatDurationDelta(delta: PeriodDelta): string {
  if (delta.direction === "flat") {
    return "No change";
  }

  const prefix = delta.direction === "up" ? "+" : "−";

  return `${prefix}${formatAnalyticsDuration(delta.value) ?? "0"}`;
}

/**
 * Resolve the semantic "good/bad" direction for a delta.
 * For count metrics (higher is better by default), up = positive.
 * For inverted metrics (like response times), down = positive.
 */
export function getDeltaSentiment(
  direction: PeriodDeltaDirection,
  inverted = false,
): "positive" | "negative" | "neutral" {
  if (direction === "flat") {
    return "neutral";
  }

  if (inverted) {
    return direction === "down" ? "positive" : "negative";
  }

  return direction === "up" ? "positive" : "negative";
}
