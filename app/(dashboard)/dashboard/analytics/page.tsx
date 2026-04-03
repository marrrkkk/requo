import {
  BarChart3,
  CalendarRange,
  Trophy,
  Workflow,
} from "lucide-react";

import {
  DashboardDetailLayout,
  DashboardPage,
  DashboardSidebarStack,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
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
    <DashboardPage>
      <PageHeader
        eyebrow="Analytics"
        title="Simple performance view"
        description="Track inquiry volume, quote movement, and recent trend."
      />

      <DashboardStatsGrid>
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
      </DashboardStatsGrid>

      <DashboardDetailLayout>
        <AnalyticsTrendOverview points={analytics.recentTrend} />

        <DashboardSidebarStack>
          <AnalyticsStatusBreakdown rows={analytics.inquiryStatusCounts} />
          <AnalyticsQuoteSummary data={analytics.quoteSummary} />
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}
