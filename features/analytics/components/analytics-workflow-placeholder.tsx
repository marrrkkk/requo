import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Hourglass,
  Inbox,
  MessagesSquare,
  Timer,
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
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import type { PlaceholderWorkflowData } from "@/features/paywall";
import {
  formatAnalyticsDuration,
  formatAnalyticsPercent,
} from "@/features/analytics/utils";

/**
 * Static placeholder rendering of the workflow analytics tab.
 * Used as the blurred preview content inside PremiumContentBlur
 * when the user lacks the "analyticsWorkflow" entitlement.
 *
 * This component renders only hardcoded placeholder data — no real
 * user or business data is ever passed to it.
 */
export function AnalyticsWorkflowPlaceholder({
  data,
}: {
  data: PlaceholderWorkflowData;
}) {
  const fu = data.followUps;

  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          icon={FileText}
          title="Quotes sent"
          value={`${data.summary.quotesSent}`}
          description="Quotes sent in the recent window"
        />
        <AnalyticsMetricCard
          icon={Eye}
          title="Quotes viewed"
          value={`${data.summary.quotesAccepted}`}
          description={`${data.summary.quotesAccepted} accepted by customers`}
        />
        <AnalyticsMetricCard
          icon={CheckCircle2}
          title="Acceptance rate"
          value={formatAnalyticsPercent(
            data.summary.quotesSent
              ? (data.summary.quotesAccepted / data.summary.quotesSent) * 100
              : 0,
          )}
          description={`${data.summary.quotesAccepted} accepted from ${data.summary.quotesSent} sent quotes`}
        />
        <AnalyticsMetricCard
          icon={MessagesSquare}
          title="Response rate"
          value={`${Math.round(data.summary.responseRate)}%`}
          description="Recent inquiries that received a response"
        />
      </DashboardStatsGrid>

      <DashboardDetailLayout>
        <div className="min-w-0 flex flex-col gap-6">
          <Card className="gap-0 bg-background/72 xl:min-h-[27rem]">
            <CardHeader className="gap-2">
              <CardTitle>Quote timing</CardTitle>
              <CardDescription>
                Track how fast inquiries get a response, how quickly they turn into quotes, and how long decisions take.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                <AnalyticsMetricCard
                  icon={MessagesSquare}
                  title="Response rate"
                  value={`${Math.round(data.summary.responseRate)}%`}
                />
                <AnalyticsDurationCard
                  icon={Clock}
                  title="Avg first response"
                  value={formatAnalyticsDuration(data.summary.avgFirstResponseHours)}
                  emptyLabel="No data"
                />
                <AnalyticsDurationCard
                  icon={Hourglass}
                  title="Avg inquiry to quote"
                  value={formatAnalyticsDuration(data.summary.avgTimeToFirstQuoteHours)}
                  emptyLabel="No data"
                />
                <AnalyticsDurationCard
                  icon={Timer}
                  title="Avg sent to decision"
                  value={formatAnalyticsDuration(data.summary.avgTimeSentToDecisionHours)}
                  emptyLabel="No data"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DashboardSidebarStack>
          <Card className="gap-0 bg-background/72">
            <CardHeader className="gap-2">
              <CardTitle>Quote status mix</CardTitle>
              <CardDescription>
                Current non-deleted quotes by lifecycle status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder status rows */}
              <div className="grid gap-3">
                {["Sent", "Viewed", "Accepted", "Rejected"].map((status) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/80 px-3 py-2.5"
                    key={status}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {status}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      —
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </DashboardSidebarStack>
      </DashboardDetailLayout>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 bg-background/72">
          <CardHeader className="gap-2">
            <CardTitle>Operational alerts</CardTitle>
            <CardDescription>
              Inquiries and quotes that may need attention based on response time thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <AnalyticsMetricCard
                icon={Inbox}
                title="Stale inquiries"
                value={`${data.summary.staleInquiryCount}`}
                description="No response for 48+ hours"
              />
              <AnalyticsMetricCard
                icon={AlertTriangle}
                title="Pending quotes 7d+"
                value={`${data.summary.pendingQuotesOverSevenDays}`}
                description="Sent over 7 days ago, no response"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 bg-background/72">
          <CardHeader className="gap-2">
            <CardTitle>Follow-up activity</CardTitle>
            <CardDescription>
              Follow-up discipline over the last 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <AnalyticsMetricCard
                icon={CalendarCheck}
                title="Completion rate"
                value={formatAnalyticsPercent(fu.completionRate)}
                description={`${fu.completed} completed of ${fu.created} created`}
              />
              <AnalyticsDurationCard
                icon={Timer}
                title="Avg time to complete"
                value={`${fu.avgDaysToComplete}d`}
                emptyLabel="No data"
                description="Average days from creation to completion"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
