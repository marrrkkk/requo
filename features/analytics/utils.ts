export function formatAnalyticsPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function getTrendBarHeight(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return "12%";
  }

  const ratio = value / maxValue;

  return `${Math.max(12, Math.round(ratio * 100))}%`;
}
