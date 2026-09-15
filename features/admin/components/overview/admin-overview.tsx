import { AdminSystemHealthBanner } from "@/features/admin/components/admin-system-health-summary";
import { AdminOverviewActivity } from "@/features/admin/components/overview/admin-overview-activity";
import {
  AdminOverviewAiSection,
  AdminOverviewEmailSection,
  AdminOverviewInquiriesSection,
  AdminOverviewQuotesSection,
} from "@/features/admin/components/overview/admin-overview-breakdowns";
import { AdminOverviewStats } from "@/features/admin/components/overview/admin-overview-stats";
import {
  getAdminDashboardCounts,
  getAdminOverviewMetrics,
  getAdminRecentActivity,
} from "@/features/admin/queries";

/**
 * Admin landing Overview.
 *
 * Async server component. The three payloads resolve in parallel — each
 * query is a bounded aggregate (cached for 60s), so the page stays fast
 * regardless of platform size. Auth is enforced inside every query
 * (defense in depth) on top of the page-level `withAdminViewLog` gate.
 *
 * Composition (top to bottom):
 * 1. System health banner — the existing `AdminSystemHealthBanner`
 * 2. KPI tiles — shared `StatCards variant="plain"`
 * 3. Product pipelines — inquiry + quote status breakdowns
 * 4. AI spend and reliability (24h, with the unpriced-cost floor note)
 * 5. Email throughput (24h + 7d)
 * 6. Recent activity feed
 */
export async function AdminOverview() {
  const [counts, metrics, activity] = await Promise.all([
    getAdminDashboardCounts(),
    getAdminOverviewMetrics(),
    getAdminRecentActivity(),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminSystemHealthBanner />

      <AdminOverviewStats counts={counts} metrics={metrics} />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <AdminOverviewInquiriesSection inquiries={metrics.inquiries} />
        <AdminOverviewQuotesSection quotes={metrics.quotes} />
      </div>

      <AdminOverviewAiSection ai={metrics.ai} />

      <AdminOverviewEmailSection email={metrics.email} />

      <AdminOverviewActivity items={activity} />
    </div>
  );
}
