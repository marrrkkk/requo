import {
  BarChart3,
  CalendarRange,
  Trophy,
  Workflow,
} from "lucide-react";
import { redirect } from "next/navigation";

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
import { getBusinessAnalyticsData } from "@/features/analytics/queries";
import { formatAnalyticsPercent } from "@/features/analytics/utils";
import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

type AnalyticsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(businessesHubPath);
  }

  const analytics = await getBusinessAnalyticsData(businessContext.business.id);
  const closedOutcomeCount = analytics.wonCount + analytics.lostCount;
  const winRate = closedOutcomeCount
    ? analytics.wonCount / closedOutcomeCount
    : 0;

  return (
    <DashboardPage>
      <PageHeader eyebrow="Analytics" title="Performance" />

      <DashboardStatsGrid>
        <AnalyticsMetricCard
          icon={BarChart3}
          title="Total inquiries"
          value={`${analytics.totalInquiries}`}
        />
        <AnalyticsMetricCard
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
