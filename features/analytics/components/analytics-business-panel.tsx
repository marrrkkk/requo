import {
  AlertTriangle,
  Banknote,
  Bot,
  CalendarCheck,
  Clock,
  Hourglass,
  Inbox,
  MessagesSquare,
  Timer,
} from "lucide-react";

import { DashboardStatsGrid } from "@/components/shared/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import type { BusinessAnalyticsData } from "@/features/analytics/types";
import { formatDuration, formatMoney, formatPercent } from "@/features/analytics/utils";

export function AnalyticsBusinessPanel({
  data,
  currency,
}: {
  data: BusinessAnalyticsData;
  currency: string;
}) {
  const { timing, alerts, followUps: fu, revenue, ai } = data;
  const hasFollowUps = fu.created > 0;
  const hasAi = ai.totalInvocations > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Timing */}
      <div>
        <h2 className="meta-label mb-4">Workflow timing (last 30 days)</h2>
        <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsMetricCard
            icon={MessagesSquare}
            title="Response rate"
            value={formatPercent(timing.responseRate)}
            tooltip="Inquiries with at least one response."
          />
          <AnalyticsMetricCard
            icon={Clock}
            title="First response"
            value={formatDuration(timing.avgFirstResponseHours) ?? "—"}
            tooltip="Average time to first owner/staff response."
          />
          <AnalyticsMetricCard
            icon={Hourglass}
            title="Inquiry → quote"
            value={formatDuration(timing.avgTimeToFirstQuoteHours) ?? "—"}
            tooltip="Average time from inquiry to first quote."
          />
          <AnalyticsMetricCard
            icon={Timer}
            title="Sent → decision"
            value={formatDuration(timing.avgTimeSentToDecisionHours) ?? "—"}
            tooltip="Average time customers take to respond after receiving a quote."
          />
        </DashboardStatsGrid>
      </div>

      {/* Alerts + Revenue side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 bg-background/72">
          <CardHeader className="gap-2">
            <CardTitle>Attention needed</CardTitle>
            <CardDescription>Items that may be slipping.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <AnalyticsMetricCard
                icon={Inbox}
                title="Stale inquiries"
                value={`${alerts.staleInquiryCount}`}
                description="No response for 48+ hours"
              />
              <AnalyticsMetricCard
                icon={AlertTriangle}
                title="Pending quotes"
                value={`${alerts.pendingQuotesOverSevenDays}`}
                description="Sent 7+ days ago, no response"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 bg-background/72">
          <CardHeader className="gap-2">
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Accepted quote value (last 30 days).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <AnalyticsMetricCard
                icon={Banknote}
                title="Accepted value"
                value={formatMoney(revenue.acceptedValueInCents, currency)}
              />
              <AnalyticsMetricCard
                icon={Banknote}
                title="Avg quote value"
                value={formatMoney(revenue.averageAcceptedValueInCents, currency)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups */}
      <Card className="gap-0 bg-background/72">
        <CardHeader className="gap-2">
          <CardTitle>Follow-up activity</CardTitle>
          <CardDescription>
            {hasFollowUps
              ? "Follow-up discipline over the last 30 days."
              : "Create follow-ups to see activity here."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasFollowUps ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AnalyticsMetricCard
                icon={CalendarCheck}
                title="Completion rate"
                value={formatPercent(fu.completionRate)}
                description={`${fu.completed} of ${fu.created}`}
              />
              <AnalyticsMetricCard
                icon={Timer}
                title="Avg to complete"
                value={fu.avgDaysToComplete !== null ? `${fu.avgDaysToComplete}d` : "—"}
              />
              {fu.overdue > 0 ? (
                <AnalyticsMetricCard
                  icon={AlertTriangle}
                  title="Overdue"
                  value={`${fu.overdue}`}
                  description="Past due date"
                />
              ) : null}
              {fu.skipped > 0 ? (
                <AnalyticsMetricCard
                  icon={CalendarCheck}
                  title="Skipped"
                  value={`${fu.skipped}`}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No follow-ups in the last 30 days.
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI usage */}
      {hasAi ? (
        <Card className="gap-0 bg-background/72">
          <CardHeader className="gap-2">
            <CardTitle>AI usage</CardTitle>
            <CardDescription>Assistant activity (last 30 days).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <AnalyticsMetricCard
                icon={Bot}
                title="Invocations"
                value={`${ai.totalInvocations}`}
              />
              <AnalyticsMetricCard
                icon={Bot}
                title="Tokens"
                value={`${(ai.totalTokens / 1000).toFixed(1)}k`}
              />
              <AnalyticsMetricCard
                icon={Bot}
                title="Est. cost"
                value={formatMoney(ai.estimatedCostCents)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
