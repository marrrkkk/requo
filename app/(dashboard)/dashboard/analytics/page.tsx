import {
  BarChart3,
  CalendarRange,
  Trophy,
  Workflow,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsQuoteSummary } from "@/features/analytics/components/analytics-quote-summary";
import { AnalyticsStatusBreakdown } from "@/features/analytics/components/analytics-status-breakdown";
import { AnalyticsTrendOverview } from "@/features/analytics/components/analytics-trend-overview";
import { getWorkspaceAnalyticsData } from "@/features/analytics/queries";
import { formatAnalyticsPercent } from "@/features/analytics/utils";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

export default async function AnalyticsPage() {
  const { workspaceContext } = await requireCurrentWorkspaceContext();
  const analytics = await getWorkspaceAnalyticsData(workspaceContext.workspace.id);
  const closedOutcomeCount = analytics.wonCount + analytics.lostCount;
  const winRate = closedOutcomeCount
    ? analytics.wonCount / closedOutcomeCount
    : 0;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Analytics"
        title="Simple performance view"
        description="Track inquiry volume, quote movement, and recent trend."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          description="All inquiries"
          icon={BarChart3}
          title="Total inquiries"
          value={`${analytics.totalInquiries}`}
        />
        <AnalyticsMetricCard
          description="Last 7 days"
          icon={CalendarRange}
          title="Inquiries this week"
          value={`${analytics.inquiriesThisWeek}`}
        />
        <AnalyticsMetricCard
          description={`${analytics.wonCount} won / ${analytics.lostCount} lost`}
          icon={Trophy}
          title="Won vs lost"
          value={formatAnalyticsPercent(winRate)}
        />
        <AnalyticsMetricCard
          description={`${analytics.quoteSummary.acceptedQuotes} accepted`}
          icon={Workflow}
          title="Quote acceptance"
          value={formatAnalyticsPercent(analytics.quoteSummary.acceptanceRate)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AnalyticsTrendOverview points={analytics.recentTrend} />

        <div className="flex flex-col gap-6">
          <AnalyticsStatusBreakdown rows={analytics.inquiryStatusCounts} />
          <AnalyticsQuoteSummary data={analytics.quoteSummary} />
        </div>
      </div>
    </div>
  );
}
