import {
  AlertTriangle,
  Clock,
  Hourglass,
  Inbox,
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
    data.avgTimeToQuoteHours !== null ||
    data.avgTimeSentToDecisionHours !== null;
  const hasWorkItems =
    data.staleInquiryCount > 0 || data.pendingQuotesOverSevenDays > 0;

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
        <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-2">
          <AnalyticsDurationCard
            icon={Clock}
            title="Avg inquiry → quote"
            value={formatAnalyticsDuration(data.avgTimeToQuoteHours)}
            emptyLabel="No data"
            description="Time from inquiry to quote creation"
            tooltip="Average time between receiving an inquiry and creating a quote for it."
          />
          <AnalyticsDurationCard
            icon={Hourglass}
            title="Avg sent → decision"
            value={formatAnalyticsDuration(data.avgTimeSentToDecisionHours)}
            emptyLabel="No data"
            description="Time from quote sent to customer response"
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
                value={`${data.staleInquiryCount}`}
                description="No response for 48+ hours"
                tooltip="Inquiries still in new or waiting status with no reply for over 2 days."
              />
              <AnalyticsMetricCard
                icon={AlertTriangle}
                title="Pending quotes 7d+"
                value={`${data.pendingQuotesOverSevenDays}`}
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
