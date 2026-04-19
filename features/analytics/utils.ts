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
