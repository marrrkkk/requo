import { AdminOverviewStatCards } from "@/features/admin/components/overview/admin-overview-stat-cards";
import type {
  AdminDashboardCounts,
  AdminOverviewMetrics,
} from "@/features/admin/types";

const countFormatter = new Intl.NumberFormat("en-US");

const costFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Thousand-separated count for stat tiles and breakdown rows. */
export function formatAdminCount(value: number): string {
  return countFormatter.format(value);
}

/**
 * Estimated AI spend for the trailing 24 hours.
 *
 * This is a floor, not the real spend: `estimated_cost_cents` is NULL for
 * unpriced models, which `sum()` silently skips. Callers must also surface
 * `getUnpricedCostNote` whenever `unpricedCalls > 0`.
 */
export function formatAdminCostCents(cents: number): string {
  return costFormatter.format(cents / 100);
}

/**
 * Percentage of `numerator` over `denominator`, one decimal place.
 *
 * Returns null when there is nothing to divide by so callers render an
 * explicit empty state ("—") instead of `NaN%`.
 */
export function formatAdminPercent(
  numerator: number,
  denominator: number,
): string | null {
  if (denominator <= 0) {
    return null;
  }

  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

/**
 * Serializable icon keys for the overview tiles.
 *
 * `AdminOverviewStatCards` is a client component and icons are component
 * references, which cannot cross the server → client boundary — so the
 * builder below emits keys and the cards resolve them to icon components
 * client-side (same bridge as `HomeKpiCards`).
 */
export type AdminOverviewStatIcon =
  | "users"
  | "businesses"
  | "inquiries"
  | "quotes";

export type AdminOverviewStat = {
  icon: AdminOverviewStatIcon;
  label: string;
  value: string;
  /** Momentum pill next to the label. */
  delta: string;
  /** Badge sentiment: primary when the window is active, muted when empty. */
  variant: "default" | "secondary";
  /** One line explaining what the delta counts. */
  caption: string;
};

/**
 * Build the four KPI tiles for the Overview page.
 *
 * Totals come from the aggregate metrics; the deltas reuse the 7-day
 * throughput counts so each tile pairs a lifetime figure with recent
 * momentum. Every tile carries a delta — zero states read "0 in 7d",
 * never an empty pill.
 */
export function buildAdminOverviewStats(
  counts: AdminDashboardCounts,
  metrics: AdminOverviewMetrics,
): AdminOverviewStat[] {
  return [
    {
      icon: "users",
      label: "Total users",
      value: formatAdminCount(counts.totalUsers),
      delta: `+${formatAdminCount(counts.signUpsLast7d)} in 7d`,
      variant: counts.signUpsLast7d > 0 ? "default" : "secondary",
      caption: "New accounts in the last 7 days",
    },
    {
      icon: "businesses",
      label: "Businesses",
      value: formatAdminCount(counts.totalBusinesses),
      delta: `${formatAdminCount(counts.totalActiveSubscriptions)} active subs`,
      variant: counts.totalActiveSubscriptions > 0 ? "default" : "secondary",
      caption: "Paid subscriptions active now",
    },
    {
      icon: "inquiries",
      label: "Inquiries",
      value: formatAdminCount(metrics.inquiries.total),
      delta: `${formatAdminCount(counts.inquiriesLast7d)} in 7d`,
      variant: counts.inquiriesLast7d > 0 ? "default" : "secondary",
      caption: "New requests in the last 7 days",
    },
    {
      icon: "quotes",
      label: "Quotes",
      value: formatAdminCount(metrics.quotes.total),
      delta: `${formatAdminCount(counts.quotesSentLast7d)} sent in 7d`,
      variant: counts.quotesSentLast7d > 0 ? "default" : "secondary",
      caption: "Quotes sent in the last 7 days",
    },
  ];
}

type AdminOverviewStatsProps = {
  counts: AdminDashboardCounts;
  metrics: AdminOverviewMetrics;
};

/**
 * KPI tile row for the admin Overview.
 *
 * Server wrapper: builds the serializable tile payloads and hands them to
 * the client bridge, which resolves icon keys to components on its side
 * of the boundary.
 */
export function AdminOverviewStats({ counts, metrics }: AdminOverviewStatsProps) {
  return (
    <AdminOverviewStatCards stats={buildAdminOverviewStats(counts, metrics)} />
  );
}
