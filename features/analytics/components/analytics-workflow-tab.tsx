import {
  AlertTriangle,
  Clock,
  Hourglass,
  Inbox,
  MessagesSquare,
  Timer,
} from "lucide-react";

import {
  DashboardEmptyState,
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
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import type { WorkflowAnalyticsData } from "@/features/analytics/types";
import { formatAnalyticsDuration } from "@/features/analytics/utils";

export function AnalyticsWorkflowTab({
  data,
}: {
  data: WorkflowAnalyticsData;
}) {
  const hasTimingData =
    data.summary.avgFirstResponseHours !== null ||
    data.summary.avgTimeToFirstQuoteHours !== null ||
    data.summary.avgTimeSentToDecisionHours !== null ||
    data.summary.responseRate > 0;
  const hasWorkItems =
    data.alerts.staleInquiryCount > 0 ||
    data.alerts.pendingQuotesOverSevenDays > 0;

  if (!hasTimingData && !hasWorkItems) {
    return (
      <DashboardEmptyState
        description="Response time and follow-up metrics will appear as your workflow history builds up."
        icon={Timer}
        title="No workflow data yet"
        variant="section"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {hasTimingData ? (
        <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsMetricCard
            icon={MessagesSquare}
            title="Response rate"
            value={`${Math.round(data.summary.responseRate * 100)}%`}
            description="Recent inquiries that received a first response"
            tooltip="Percentage of inquiries from the last 30 days that received at least one owner or staff response."
          />
          <AnalyticsDurationCard
            icon={Clock}
            title="Avg first response"
            value={formatAnalyticsDuration(data.summary.avgFirstResponseHours)}
            emptyLabel="No data"
            description="Time from inquiry to first owner or staff action"
            tooltip="Average time between receiving an inquiry and the first owner or staff response."
          />
          <AnalyticsDurationCard
            icon={Hourglass}
            title="Avg inquiry to quote"
            value={formatAnalyticsDuration(data.summary.avgTimeToFirstQuoteHours)}
            emptyLabel="No data"
            description="Time from inquiry submission to first quote creation"
            tooltip="Average time between receiving an inquiry and creating the first quote linked to it."
          />
          <AnalyticsDurationCard
            icon={Timer}
            title="Avg sent to decision"
            value={formatAnalyticsDuration(data.summary.avgTimeSentToDecisionHours)}
            emptyLabel="No data"
            description="Time from quote sent to customer decision"
            tooltip="How long customers take to accept or reject after you send a quote."
          />
        </DashboardStatsGrid>
      ) : null}

      {hasWorkItems ? (
        <Card className="gap-0 bg-background/72">
          <CardHeader className="gap-2">
            <CardTitle>Follow-up alerts</CardTitle>
            <CardDescription>
              Items that may need attention based on response time thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <AnalyticsMetricCard
                icon={Inbox}
                title="Stale inquiries"
                value={`${data.alerts.staleInquiryCount}`}
                description="No response for 48+ hours"
                tooltip="Open inquiries that still have no owner or staff response after 48 hours."
              />
              <AnalyticsMetricCard
                icon={AlertTriangle}
                title="Pending quotes 7d+"
                value={`${data.alerts.pendingQuotesOverSevenDays}`}
                description="Sent over 7 days ago, no response"
                tooltip="Quotes you sent that the customer hasn't responded to in over a week."
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
