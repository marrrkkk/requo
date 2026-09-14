/**
 * Compact count for dense AI breakdown rows (1.2K / 3.4M).
 *
 * Full thousand-separated figures stay in the KPI tiles; these helpers
 * serve the provider / task-type / capacity tables where width matters.
 */
export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `${trimZeros(value / 1_000_000)}M`;
  }

  if (abs >= 1_000) {
    return `${trimZeros(value / 1_000)}K`;
  }

  return `${value}`;
}

function trimZeros(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function formatLatencyMs(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value).toLocaleString("en-US")} ms`;
}

/** Load ratio as a whole percent (`0.42` → `"42%"`). */
export function formatLoadPercent(loadRatio: number): string {
  if (!Number.isFinite(loadRatio)) {
    return "—";
  }

  return `${Math.round(loadRatio * 100)}%`;
}

const aiDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const aiDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatAiDate(value: Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return aiDateFormatter.format(date);
}

export function formatAiDateTime(value: Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return aiDateTimeFormatter.format(date);
}
