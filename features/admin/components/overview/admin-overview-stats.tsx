import type { Stat } from "@/components/application/dashboard/stat-cards";
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
 * `StatCards` is a client component and `Stat.icon` is a component
 * reference, which cannot cross the server → client boundary — so the
 * builder below emits keys and `AdminOverviewStatCards` resolves them to
 * icon components client-side (same bridge as `HomeKpiCards`).
 */
export type AdminOverviewStatIcon =
  | "users"
  | "businesses"
  | "inquiries"
  | "quotes";

export type AdminOverviewStat = Omit<Stat, "icon"> & {
  icon: AdminOverviewStatIcon;
};

/**
 * Build the four KPI tiles for the Overview page.
 *
 * Totals come from the aggregate metrics; the deltas reuse the 7-day
 * throughput counts so each tile pairs a lifetime figure with recent
 * momentum. `StatCards variant="plain"` always renders the delta pill, so
 * every tile carries one — zero states read "0 in 7d", never an empty pill.
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
      deltaColor: counts.signUpsLast7d > 0 ? "lime" : "neutral",
      deltaDirection: counts.signUpsLast7d > 0 ? "up" : "flat",
    },
    {
      icon: "businesses",
      label: "Businesses",
      value: formatAdminCount(counts.totalBusinesses),
      delta: `${formatAdminCount(counts.totalActiveSubscriptions)} active subs`,
      deltaColor: counts.totalActiveSubscriptions > 0 ? "lime" : "neutral",
      deltaDirection: counts.totalActiveSubscriptions > 0 ? "up" : "flat",
    },
    {
      icon: "inquiries",
      label: "Inquiries",
      value: formatAdminCount(metrics.inquiries.total),
      delta: `${formatAdminCount(counts.inquiriesLast7d)} in 7d`,
      deltaColor: counts.inquiriesLast7d > 0 ? "lime" : "neutral",
      deltaDirection: counts.inquiriesLast7d > 0 ? "up" : "flat",
    },
    {
      icon: "quotes",
      label: "Quotes",
      value: formatAdminCount(metrics.quotes.total),
      delta: `${formatAdminCount(counts.quotesSentLast7d)} sent in 7d`,
      deltaColor: counts.quotesSentLast7d > 0 ? "lime" : "neutral",
      deltaDirection: counts.quotesSentLast7d > 0 ? "up" : "flat",
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
