import {
  BarChart3,
  CalendarRange,
  FileText,
  Trophy,
} from "lucide-react";

import {
  DashboardDetailLayout,
  DashboardSidebarStack,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsQuoteSummary } from "@/features/analytics/components/analytics-quote-summary";
import { AnalyticsStatusBreakdown } from "@/features/analytics/components/analytics-status-breakdown";
import { AnalyticsTrendOverview } from "@/features/analytics/components/analytics-trend-overview";
import { AnalyticsActivityGraph } from "@/features/analytics/components/analytics-activity-graph";
import type { BusinessAnalyticsData } from "@/features/analytics/types";
import { formatAnalyticsPercent } from "@/features/analytics/utils";

export function AnalyticsOverviewTab({
  data,
}: {
  data: BusinessAnalyticsData;
}) {
  const closedOutcomeCount = data.wonCount + data.lostCount;
  const winRate = closedOutcomeCount ? data.wonCount / closedOutcomeCount : 0;

  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid>
        <AnalyticsMetricCard
          icon={BarChart3}
          title="All inquiries"
          value={`${data.totalInquiries}`}
          tooltip="Total number of inquiries submitted to your business."
        />
        <AnalyticsMetricCard
          icon={CalendarRange}
          title="New this week"
          value={`${data.inquiriesThisWeek}`}
          tooltip="Inquiries received in the last 7 days."
        />
        <AnalyticsMetricCard
          description={`${data.wonCount} won / ${data.lostCount} lost`}
          icon={Trophy}
          title="Inquiry win rate"
          value={formatAnalyticsPercent(winRate)}
          tooltip="Percentage of closed inquiries marked as won."
        />
        <AnalyticsMetricCard
          icon={FileText}
          title="Total quotes"
          value={`${data.quoteSummary.totalQuotes}`}
          description={`${data.quoteSummary.sentQuotes} sent`}
          tooltip="Total number of quotes created for your business."
        />
      </DashboardStatsGrid>

      <DashboardDetailLayout>
        <div className="flex flex-col gap-6 min-w-0">
          <AnalyticsTrendOverview points={data.recentTrend} />
          <AnalyticsActivityGraph data={data.activityGraph} />
        </div>

        <DashboardSidebarStack>
          <AnalyticsStatusBreakdown rows={data.inquiryStatusCounts} />
          <AnalyticsQuoteSummary data={data.quoteSummary} />
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </div>
  );
}
