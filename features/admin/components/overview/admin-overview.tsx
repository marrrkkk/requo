import { AdminSystemHealthBanner } from "@/features/admin/components/admin-system-health-summary";
import { AdminNeedsAttention } from "@/features/admin/components/overview/admin-needs-attention";
import { AdminOverviewActivity } from "@/features/admin/components/overview/admin-overview-activity";
import { AdminQuickLinks } from "@/features/admin/components/overview/admin-quick-links";import {
  AdminOverviewAiSection,
  AdminOverviewEmailSection,
  AdminOverviewInquiriesSection,
  AdminOverviewQuotesSection,
} from "@/features/admin/components/overview/admin-overview-breakdowns";
import { AdminOverviewStats } from "@/features/admin/components/overview/admin-overview-stats";
import { AdminOverviewTrend } from "@/features/admin/components/overview/admin-overview-trend";
import {
  getAdminDashboardCounts,
  getAdminOverviewMetrics,
  getAdminRecentActivity,
  getAdminUsageReport,
} from "@/features/admin/queries";

/**
 * Admin landing Overview.
 *
 * Async server component. The payloads resolve in parallel — each
 * query is a bounded aggregate (cached for 60s), so the page stays fast
 * regardless of platform size. Auth is enforced inside every query
 * (defense in depth) on top of the page-level `withAdminViewLog` gate.
 *
 * Composition (top to bottom):
 * 1. System health strip
 * 2. KPI tiles — shadcn `Card` + `Badge` momentum pills
 * 3. Platform activity trend (30d, lazy-loaded chart)
 * 4. Product pipelines — inquiry + quote status breakdowns with share bars
 * 5. AI spend and reliability (24h) + email throughput (24h + 7d)
 * 6. Recent activity feed + needs-attention queue
 */
export async function AdminOverview() {
  const [counts, metrics, activity, usage] = await Promise.all([
    getAdminDashboardCounts(),
    getAdminOverviewMetrics(),
    getAdminRecentActivity(),
    getAdminUsageReport(30),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminSystemHealthBanner />

      <AdminOverviewStats counts={counts} metrics={metrics} />

      <AdminOverviewTrend report={usage} />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminOverviewInquiriesSection inquiries={metrics.inquiries} />
        <AdminOverviewQuotesSection quotes={metrics.quotes} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminOverviewAiSection ai={metrics.ai} />
        <AdminOverviewEmailSection email={metrics.email} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <AdminOverviewActivity items={activity} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <AdminNeedsAttention metrics={metrics} />
          <AdminQuickLinks />
        </div>
      </div>
    </div>
  );
}
