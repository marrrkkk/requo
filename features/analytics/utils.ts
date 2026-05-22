import type { PeriodDelta, PeriodDeltaDirection } from "@/features/analytics/types";

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatDuration(hours: number | null): string | null {
  if (hours === null) return null;

  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return minutes <= 1 ? "< 1 min" : `${minutes} min`;
  }

  if (hours < 24) {
    return `${Math.round(hours * 10) / 10}h`;
  }

  return `${Math.round((hours / 24) * 10) / 10}d`;
}

export function formatMoney(amountInCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
}

export function formatWeekLabel(weekStart: Date): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  if (
    weekStart.getUTCFullYear() === weekEnd.getUTCFullYear() &&
    weekStart.getUTCMonth() === weekEnd.getUTCMonth()
  ) {
    return `${fmt.format(weekStart)}-${weekEnd.getUTCDate()}`;
  }

  return `${fmt.format(weekStart)}-${fmt.format(weekEnd)}`;
}

export function computeDelta(current: number, prior: number): PeriodDelta {
  const diff = current - prior;

  if (diff === 0 || (current === 0 && prior === 0)) {
    return { value: 0, direction: "flat" };
  }

  return {
    value: Math.abs(diff),
    direction: diff > 0 ? "up" : "down",
  };
}

export function formatDelta(delta: PeriodDelta): string {
  if (delta.direction === "flat") return "No change";
  const prefix = delta.direction === "up" ? "+" : "−";
  return `${prefix}${delta.value}`;
}

export function getDeltaSentiment(
  direction: PeriodDeltaDirection,
  inverted = false,
): "positive" | "negative" | "neutral" {
  if (direction === "flat") return "neutral";
  if (inverted) return direction === "down" ? "positive" : "negative";
  return direction === "up" ? "positive" : "negative";
}
