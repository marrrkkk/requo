import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CheckCircle2,
  CircleCheck,
  Clock,
  Hourglass,
  Inbox,
  Eye,
  FileText,
  ListChecks,
  MessagesSquare,
  SkipForward,
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
import type { WorkflowAnalyticsData } from "@/features/analytics/types";
import {
  formatAnalyticsDuration,
  formatAnalyticsPercent,
} from "@/features/analytics/utils";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";

export function AnalyticsWorkflowTab({
  data,
}: {
  data: WorkflowAnalyticsData;
}) {
  const fu = data.followUpSummary;
  const hasFollowUpData = fu.created > 0;

  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          icon={FileText}
          title="Quotes sent"
          value={`${data.summary.quotesSent}`}
          description={`${data.summary.quotesVoided} voided in the same window`}
          tooltip="Quotes sent in the last 30 days, including how many were later voided."
        />
        <AnalyticsMetricCard
          icon={Eye}
          title="Quotes viewed"
          value={`${data.summary.quotesViewed}`}
          description={`${data.summary.quotesAccepted} accepted by customers`}
          tooltip="How many sent quotes were opened by customers in the last 30 days."
        />
        <AnalyticsMetricCard
          icon={CheckCircle2}
          title="Acceptance rate"
          value={formatAnalyticsPercent(data.summary.quoteAcceptanceRate)}
          description={`${data.summary.quotesAccepted} accepted from ${data.summary.quotesSent} sent quotes`}
          tooltip="Accepted quotes divided by sent quotes in the last 30 days."
        />
        <AnalyticsMetricCard
          icon={MessagesSquare}
          title="Inquiry to quote"
          value={formatAnalyticsPercent(data.summary.inquiryToQuoteRate)}
          description="Recent inquiries that reached the quoting stage"
          tooltip="Percentage of recent inquiries that received at least one quote."
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
                  value={`${Math.round(data.summary.responseRate * 100)}%`}
                  tooltip="Percentage of inquiries from the last 30 days that received at least one owner or staff response."
                />
                <AnalyticsDurationCard
                  icon={Clock}
                  title="Avg first response"
                  value={formatAnalyticsDuration(data.summary.avgFirstResponseHours)}
                  emptyLabel="No data"
                  tooltip="Average time between receiving an inquiry and the first owner or staff response."
                />
                <AnalyticsDurationCard
                  icon={Hourglass}
                  title="Avg inquiry to quote"
                  value={formatAnalyticsDuration(data.summary.avgTimeToFirstQuoteHours)}
                  emptyLabel="No data"
                  tooltip="Average time between receiving an inquiry and creating the first quote linked to it."
                />
                <AnalyticsDurationCard
                  icon={Timer}
                  title="Avg sent to decision"
                  value={formatAnalyticsDuration(data.summary.avgTimeSentToDecisionHours)}
                  emptyLabel="No data"
                  tooltip="How long customers take to accept or reject after you send a quote."
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
            <CardContent className="grid gap-3">
              {data.statusCounts.map((row) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/80 px-3 py-2.5"
                  key={row.status}
                >
                  <QuoteStatusBadge status={row.status} />
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {row.count.toLocaleString()}
                  </span>
                </div>
              ))}
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
              <AnalyticsMetricCard
                icon={CircleCheck}
                title="Completed"
                value={`${data.summary.quotesCompleted}`}
                description="Accepted quotes with fulfilled work"
                tooltip="Accepted quotes where the work was marked completed."
              />
              <AnalyticsMetricCard
                icon={Ban}
                title="Canceled after acceptance"
                value={`${data.summary.quotesCanceledAfterAcceptance}`}
                description="Customer backed out after accepting"
                tooltip="Accepted quotes that were later canceled by the customer or business."
              />
              {data.summary.acceptedNeedingNextStepCount > 0 ? (
                <AnalyticsMetricCard
                  icon={ListChecks}
                  title="Needs next step"
                  value={`${data.summary.acceptedNeedingNextStepCount}`}
                  description="Accepted quotes not yet completed or canceled"
                  tooltip="Accepted quotes that still need scheduling, a deposit, or other follow-through."
                />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 bg-background/72">
          <CardHeader className="gap-2">
            <CardTitle>Follow-up activity</CardTitle>
            <CardDescription>
              {hasFollowUpData
                ? "Follow-up discipline over the last 30 days."
                : "Follow-up stats will appear once you start creating follow-ups."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasFollowUpData ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <AnalyticsMetricCard
                  icon={CalendarCheck}
                  title="Completion rate"
                  value={formatAnalyticsPercent(fu.completionRate)}
                  description={`${fu.completed} completed of ${fu.created} created`}
                  tooltip="Percentage of follow-ups created in the last 30 days that were completed."
                />
                <AnalyticsDurationCard
                  icon={Timer}
                  title="Avg time to complete"
                  value={fu.avgDaysToComplete !== null ? `${fu.avgDaysToComplete}d` : null}
                  emptyLabel="No data"
                  description="Average days from creation to completion"
                  tooltip="How long it takes on average to complete a follow-up after creating it."
                />
                {fu.overdue > 0 ? (
                  <AnalyticsMetricCard
                    icon={AlertTriangle}
                    title="Overdue"
                    value={`${fu.overdue}`}
                    description="Pending follow-ups past their due date"
                    tooltip="Follow-ups that are still pending and past their scheduled due date."
                  />
                ) : null}
                {fu.skipped > 0 ? (
                  <AnalyticsMetricCard
                    icon={SkipForward}
                    title="Skipped"
                    value={`${fu.skipped}`}
                    description="Follow-ups marked as skipped"
                    tooltip="Follow-ups that were intentionally skipped rather than completed."
                  />
                ) : null}
              </div>
            ) : (
              <div className="soft-panel border-dashed bg-muted/15 p-4 text-sm text-muted-foreground shadow-none">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="size-4" />
                  <span>
                    Create follow-ups on inquiries or quotes to track your outreach here.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
