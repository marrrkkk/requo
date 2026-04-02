import {
  BarChart3,
  CalendarRange,
  Trophy,
  Workflow,
} from "lucide-react";

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
    <div className="flex flex-col gap-6">
      <div className="max-w-3xl flex flex-col gap-2">
        <span className="eyebrow">Analytics</span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Track inquiry flow, quote performance, and recent momentum.
        </h1>
        <p className="text-sm leading-7 text-muted-foreground sm:text-base">
          QuoteFlow keeps analytics intentionally light for the MVP: fast
          workspace-scoped summaries, outcome counts, and trend signals you can
          act on without digging through raw tables.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          description="All inquiries stored in the current workspace."
          icon={BarChart3}
          title="Total inquiries"
          value={`${analytics.totalInquiries}`}
        />
        <AnalyticsMetricCard
          description="Incoming inquiry volume over the last 7 days."
          icon={CalendarRange}
          title="Inquiries this week"
          value={`${analytics.inquiriesThisWeek}`}
        />
        <AnalyticsMetricCard
          description={`${analytics.wonCount} won and ${analytics.lostCount} lost in closed outcomes.`}
          icon={Trophy}
          title="Won vs lost"
          value={formatAnalyticsPercent(winRate)}
        />
        <AnalyticsMetricCard
          description={`${analytics.quoteSummary.acceptedQuotes} accepted from ${analytics.quoteSummary.sentQuotes} sent quotes.`}
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
