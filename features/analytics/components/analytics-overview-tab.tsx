import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  GitCompareArrows,
  Inbox,
  MessagesSquare,
  TriangleAlert,
} from "lucide-react";

import {
  DashboardDetailLayout,
  DashboardSidebarStack,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsDurationCard } from "@/features/analytics/components/analytics-duration-card";
import { AnalyticsFunnelCard } from "@/features/analytics/components/analytics-funnel-card";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsStatusBreakdown } from "@/features/analytics/components/analytics-status-breakdown";
import { AnalyticsTrendOverview } from "@/features/analytics/components/analytics-trend-overview";
import type { BusinessAnalyticsData } from "@/features/analytics/types";
import { formatAnalyticsDuration } from "@/features/analytics/utils";
import { formatAnalyticsPercent } from "@/features/analytics/utils";

export function AnalyticsOverviewTab({
  data,
}: {
  data: BusinessAnalyticsData;
}) {
  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid>
        <AnalyticsMetricCard
          icon={Eye}
          title="Form views"
          value={`${data.summary.formViews}`}
          description={`${data.summary.uniqueVisitors} unique visitors in the last 30 days`}
          tooltip="How many times your public inquiry forms were opened in the last 30 days."
        />
        <AnalyticsMetricCard
          icon={Inbox}
          title="Inquiry submissions"
          value={`${data.summary.inquirySubmissions}`}
          description="New inquiries captured in the last 30 days"
          tooltip="How many inquiries were submitted through your forms in the last 30 days."
        />
        <AnalyticsMetricCard
          icon={MessagesSquare}
          title="Form conversion"
          value={formatAnalyticsPercent(data.summary.formConversionRate)}
          description="Visitors who became inquiries"
          tooltip="Inquiry submissions divided by unique visitors over the last 30 days."
        />
        <AnalyticsDurationCard
          icon={Clock3}
          title="Avg first response"
          value={formatAnalyticsDuration(data.summary.avgFirstResponseHours)}
          emptyLabel="No data"
          description={`${formatAnalyticsPercent(data.summary.responseRate)} response rate`}
          tooltip="Average time to the first owner or staff action on a new inquiry in the last 30 days."
        />
      </DashboardStatsGrid>

      <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          icon={GitCompareArrows}
          title="Inquiry to quote"
          value={formatAnalyticsPercent(data.summary.inquiryToQuoteRate)}
          description={`${data.summary.inquiriesWithQuote} of ${data.summary.inquirySubmissions} recent inquiries received a quote`}
          tooltip="How many recent inquiries were turned into at least one quote."
        />
        <AnalyticsMetricCard
          icon={FileText}
          title="Quotes sent"
          value={`${data.summary.quotesSent}`}
          description={`${data.summary.quotesViewed} viewed by customers`}
          tooltip="Quotes linked to the recent inquiry pipeline that were sent to customers."
        />
        <AnalyticsMetricCard
          icon={CheckCircle2}
          title="Quotes accepted"
          value={`${data.summary.quotesAccepted}`}
          description={`${data.summary.quotesRejected} rejected in the same window`}
          tooltip="Accepted and rejected quote outcomes linked to the recent inquiry pipeline."
        />
        <AnalyticsDurationCard
          icon={Clock3}
          title="Avg quote turnaround"
          value={formatAnalyticsDuration(data.summary.avgTimeToFirstQuoteHours)}
          emptyLabel="No data"
          description="Time from inquiry submission to first quote"
          tooltip="Average time between receiving an inquiry and creating the first quote linked to it."
        />
      </DashboardStatsGrid>

      <DashboardDetailLayout>
        <div className="min-w-0 flex flex-col gap-6">
          <AnalyticsFunnelCard
            title="Inquiry funnel"
            description="A simple view of how recent traffic is moving toward real work."
            steps={[
              {
                label: "Unique visitors",
                count: data.funnel.uniqueVisitors,
                detail: "People who opened one of your public inquiry forms.",
              },
              {
                label: "Inquiry submissions",
                count: data.funnel.inquirySubmissions,
                detail: "Visitors who completed an inquiry.",
                conversionRate: data.funnel.uniqueVisitors
                  ? data.funnel.inquirySubmissions / data.funnel.uniqueVisitors
                  : 0,
              },
              {
                label: "Inquiries with quotes",
                count: data.funnel.inquiriesWithQuote,
                detail: "Submitted inquiries that received at least one quote.",
                conversionRate: data.funnel.inquirySubmissions
                  ? data.funnel.inquiriesWithQuote / data.funnel.inquirySubmissions
                  : 0,
              },
              {
                label: "Accepted quotes",
                count: data.funnel.acceptedQuotes,
                detail: "Quotes linked to those recent inquiries that were accepted.",
                conversionRate: data.funnel.inquiriesWithQuote
                  ? data.funnel.acceptedQuotes / data.funnel.inquiriesWithQuote
                  : 0,
              },
            ]}
          />
          <AnalyticsTrendOverview points={data.recentTrend} />
        </div>

        <DashboardSidebarStack>
          <AnalyticsStatusBreakdown rows={data.inquiryStatusCounts} />
          <Card className="gap-0 bg-background/72">
            <CardHeader className="gap-2">
              <CardTitle>Backlog to watch</CardTitle>
              <CardDescription>
                Current items that suggest leads may be dropping off.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <AnalyticsMetricCard
                icon={TriangleAlert}
                title="Stale inquiries"
                value={`${data.backlog.staleInquiryCount}`}
                description="Open for more than 48 hours without a first response"
                tooltip="New or waiting inquiries that still have no owner or staff response after 48 hours."
              />
              <AnalyticsMetricCard
                icon={Clock3}
                title="Pending quotes"
                value={`${data.backlog.pendingQuotesOverSevenDays}`}
                description="Sent more than 7 days ago with no customer decision"
                tooltip="Quotes that have been sent for over a week and still have no customer response."
              />
            </CardContent>
          </Card>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </div>
  );
}
