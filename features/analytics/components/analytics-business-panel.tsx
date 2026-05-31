import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  Clock,
  Hourglass,
  Inbox,
  MessagesSquare,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";

import { DashboardStatsGrid } from "@/components/shared/dashboard-layout";
import { AnalyticsChartCard } from "@/features/analytics/components/analytics-chart-card";
import { AISummaryCard } from "@/features/analytics/components/ai-summary-card";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsSection } from "@/features/analytics/components/analytics-section";
import { CohortAnalysisSection } from "@/features/analytics/components/cohort-analysis-section";
import { DrillDownLink } from "@/features/analytics/components/drill-down-link";
import type { BusinessAnalyticsData, CohortRow, RevenueForecast } from "@/features/analytics/types";
import { formatDuration, formatMoney, formatPercent } from "@/features/analytics/utils";
import {
  getBusinessInquiriesPath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";

export function AnalyticsBusinessPanel({
  data,
  currency,
  aiSummary,
  businessSlug,
  cohorts,
  revenueForecast,
}: {
  data: BusinessAnalyticsData;
  currency: string;
  aiSummary?: string | null;
  businessSlug?: string;
  cohorts?: CohortRow[];
  revenueForecast?: RevenueForecast | null;
}) {
  const { timing, alerts, followUps: fu, revenue, ai } = data;
  const hasFollowUps = fu.created > 0;
  const hasDrillDown = !!businessSlug;
  const inquiriesPath = businessSlug ? getBusinessInquiriesPath(businessSlug) : "";
  const quotesPath = businessSlug ? getBusinessQuotesPath(businessSlug) : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Timing */}
      <AnalyticsSection
        eyebrow="Advanced"
        title="Workflow timing"
        description="How quickly your team moves inquiries through to decisions."
      >
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
      </AnalyticsSection>

      {/* Alerts + Revenue side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Attention needed"
          description="Items that may be slipping."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DrillDownLink
              href={hasDrillDown ? `${inquiriesPath}?status=stale` : ""}
              enabled={hasDrillDown}
            >
              <AnalyticsMetricCard
                icon={Inbox}
                title="Stale inquiries"
                value={`${alerts.staleInquiryCount}`}
                description="No response for 48+ hours"
              />
            </DrillDownLink>
            <DrillDownLink
              href={hasDrillDown ? `${quotesPath}?status=pending` : ""}
              enabled={hasDrillDown}
            >
              <AnalyticsMetricCard
                icon={AlertTriangle}
                title="Pending quotes"
                value={`${alerts.pendingQuotesOverSevenDays}`}
                description="Sent 7+ days ago, no response"
              />
            </DrillDownLink>
          </div>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Revenue"
          description="Accepted quote value for this period."
        >
          <div className="grid gap-3 sm:grid-cols-3">
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
            <AnalyticsMetricCard
              icon={Banknote}
              title="Completed value"
              value={formatMoney(revenue.completedValueInCents, currency)}
              tooltip="Revenue from accepted quotes that have been marked complete."
            />
          </div>
        </AnalyticsChartCard>
      </div>

      {/* Revenue forecast + AI usage */}
      <div className="grid gap-6 lg:grid-cols-2">
        {revenueForecast ? (
          <AnalyticsChartCard
            title="Pipeline forecast"
            description="Projected revenue from pending quotes."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <AnalyticsMetricCard
                icon={TrendingUp}
                title="Projected value"
                value={
                  revenueForecast.forecastCents !== null
                    ? formatMoney(revenueForecast.forecastCents, currency)
                    : "—"
                }
                description={`${revenueForecast.pendingQuoteCount} pending quote${revenueForecast.pendingQuoteCount !== 1 ? "s" : ""}`}
                tooltip="Estimated revenue based on pending quotes and your historical acceptance rate."
              />
              <AnalyticsMetricCard
                icon={Target}
                title="Historical win rate"
                value={formatPercent(revenueForecast.historicalAcceptanceRate)}
                description={
                  revenueForecast.averageQuoteValueCents > 0
                    ? `Avg ${formatMoney(revenueForecast.averageQuoteValueCents, currency)}`
                    : "No accepted quotes yet"
                }
                tooltip="90-day acceptance rate used for the projection."
              />
            </div>
          </AnalyticsChartCard>
        ) : null}

        {ai.totalInvocations > 0 ? (
          <AnalyticsChartCard
            title="AI usage"
            description="AI-assisted drafts and analysis this period."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <AnalyticsMetricCard
                icon={Sparkles}
                title="Invocations"
                value={ai.totalInvocations.toLocaleString()}
                description={`${ai.totalTokens.toLocaleString()} tokens used`}
              />
              <AnalyticsMetricCard
                icon={Sparkles}
                title="Estimated cost"
                value={formatMoney(ai.estimatedCostCents, currency)}
              />
            </div>
          </AnalyticsChartCard>
        ) : null}
      </div>

      {/* Follow-ups */}
      <AnalyticsChartCard
        title="Follow-up activity"
        description={
          hasFollowUps
            ? "Follow-up discipline over the last 30 days."
            : "Create follow-ups to see activity here."
        }
      >
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
              <DrillDownLink
                href={hasDrillDown ? `/${businessSlug}/follow-ups?status=overdue` : ""}
                enabled={hasDrillDown}
              >
                <AnalyticsMetricCard
                  icon={AlertTriangle}
                  title="Overdue"
                  value={`${fu.overdue}`}
                  description="Past due date"
                />
              </DrillDownLink>
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
      </AnalyticsChartCard>

      {/* AI insight */}
      {aiSummary ? <AISummaryCard summary={aiSummary} /> : null}

      {/* Cohort Analysis */}
      {cohorts ? <CohortAnalysisSection cohorts={cohorts} /> : null}
    </div>
  );
}
