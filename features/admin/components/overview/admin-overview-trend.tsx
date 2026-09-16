import Link from "next/link";

import { DashboardSection } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ADMIN_USAGE_PATH } from "@/features/admin/navigation";
import { LazyAdminUsageChart } from "@/features/admin/components/operations/usage/admin-usage-chart-lazy";
import { toChartPoints } from "@/features/admin/components/operations/usage/admin-usage-sections";
import type { AdminUsageReport } from "@/features/admin/types";

/**
 * Platform activity trend for the admin Overview.
 *
 * Reuses the usage page's lazy chart (Recharts loads client-side behind an
 * error boundary with a skeleton fallback), so the Overview adds no new
 * chart code — only a 30-day series from the already-cached usage report.
 */
export function AdminOverviewTrend({ report }: { report: AdminUsageReport }) {
  return (
    <DashboardSection
      action={
        <Button asChild size="sm" variant="outline">
          <Link href={ADMIN_USAGE_PATH} prefetch={true}>
            View usage
          </Link>
        </Button>
      }
      description={`Daily sign-ups, businesses, inquiries, quotes, emails, and AI calls from ${report.from} to ${report.to}.`}
      title="Platform activity"
    >
      <LazyAdminUsageChart points={toChartPoints(report)} />
    </DashboardSection>
  );
}
