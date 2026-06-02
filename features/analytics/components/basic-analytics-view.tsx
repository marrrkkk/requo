import {
  BellRing,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  GitCompareArrows,
  Inbox,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { AnalyticsChartCard } from "@/features/analytics/components/analytics-chart-card";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsSection } from "@/features/analytics/components/analytics-section";
import { LazyBasicTrendChart } from "@/components/shared/lazy-recharts";
import { DrillDownLink } from "@/features/analytics/components/drill-down-link";
import { MiniSparkline } from "@/features/analytics/components/mini-sparkline";
import type {
  FreeAnalyticsData,
  MetricSparklineData,
  PeriodDeltaDirection,
} from "@/features/analytics/types";
import { formatPercent } from "@/features/analytics/utils";
import {
  getBusinessFollowUpsPath,
  getBusinessInquiriesPath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";

function getDirection(points: number[]): PeriodDeltaDirection {
  if (points.length < 2) return "flat";
  const first = points[0];
  const last = points[points.length - 1];
  if (last > first) return "up";
  if (last < first) return "down";
  return "flat";
}

export function BasicAnalyticsView({
  data,
  sparklines,
  businessSlug,
  since,
  until,
}: {
  data: FreeAnalyticsData;
  sparklines?: MetricSparklineData | null;
  businessSlug?: string;
  since: Date;
  until: Date;
}) {
  const hasDrillDown = !!businessSlug;
  const inquiriesPath = businessSlug ? getBusinessInquiriesPath(businessSlug) : "";
  const quotesPath = businessSlug ? getBusinessQuotesPath(businessSlug) : "";
  const followUpsPath = businessSlug ? getBusinessFollowUpsPath(businessSlug) : "";

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsSection
        eyebrow="Basic"
        title="Pipeline overview"
        description="A quick read on inquiries → quotes → outcomes for the selected time range."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <AnalyticsMetricCard
            icon={Inbox}
            title="Inquiries"
            value={`${data.inquirySubmissions}`}
            tooltip="Total inquiries received this period."
            sparkline={
              sparklines ? (
                <MiniSparkline
                  points={sparklines.inquirySubmissions}
                  direction={getDirection(sparklines.inquirySubmissions)}
                />
              ) : undefined
            }
          />
          <AnalyticsMetricCard
            icon={FileText}
            title="Quotes sent"
            value={`${data.quotesSent}`}
            tooltip="Quotes sent to customers."
            sparkline={
              sparklines ? (
                <MiniSparkline
                  points={sparklines.quotesSent}
                  direction={getDirection(sparklines.quotesSent)}
                />
              ) : undefined
            }
          />
          <AnalyticsMetricCard
            icon={Eye}
            title="Viewed"
            value={`${data.quotesViewed}`}
            description={`${formatPercent(data.quoteViewRate)} view rate`}
            tooltip="Quotes opened by customers."
          />
          <AnalyticsMetricCard
            icon={CheckCircle2}
            title="Won"
            value={`${data.quotesAccepted}`}
            description={`${formatPercent(data.winRate)} win rate`}
            tooltip="Quotes accepted by customers (of those that got a decision)."
            sparkline={
              sparklines ? (
                <MiniSparkline
                  points={sparklines.quotesAccepted}
                  direction={getDirection(sparklines.quotesAccepted)}
                />
              ) : undefined
            }
          />
          <AnalyticsMetricCard
            icon={XCircle}
            title="Lost"
            value={`${data.quotesRejected + data.quotesExpired}`}
            description={`${data.quotesRejected} rejected · ${data.quotesExpired} expired`}
            tooltip="Quotes rejected or expired without a response."
          />
        </div>
      </AnalyticsSection>

      <AnalyticsChartCard
        title="Trend"
        description="Daily inquiries and quote activity."
      >
        {sparklines ? (
          <LazyBasicTrendChart since={since} until={until} sparklines={sparklines} />
        ) : (
          <div className="h-full min-h-[280px] w-full flex-1 rounded-xl bg-surface-muted" />
        )}
      </AnalyticsChartCard>

      <AnalyticsSection
        eyebrow="Basic"
        title="Conversion health"
        description="Key conversion rates for this period."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DrillDownLink href={inquiriesPath} enabled={hasDrillDown}>
            <AnalyticsMetricCard
              icon={Eye}
              title="Form views"
              value={`${data.formViews}`}
              description={`${data.uniqueVisitors} unique visitors`}
              tooltip="Times your public inquiry forms were viewed."
              sparkline={
                sparklines ? (
                  <MiniSparkline
                    points={sparklines.formViews}
                    direction={getDirection(sparklines.formViews)}
                  />
                ) : undefined
              }
            />
          </DrillDownLink>
          <AnalyticsMetricCard
            icon={TrendingUp}
            title="Form conversion"
            value={formatPercent(data.formConversionRate)}
            description={`${data.inquirySubmissions} submissions from ${data.uniqueVisitors} visitors`}
            tooltip="Percentage of unique visitors who submitted an inquiry."
          />
          <AnalyticsMetricCard
            icon={GitCompareArrows}
            title="Inquiry → quote"
            value={formatPercent(data.inquiryToQuoteRate)}
            description={`${data.inquiriesWithQuote} quoted of ${data.inquirySubmissions}`}
            tooltip="Percentage of inquiries that received at least one quote."
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection eyebrow="Basic" title="Quote outcomes">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DrillDownLink
            href={hasDrillDown ? `${quotesPath}?status=accepted` : ""}
            enabled={hasDrillDown}
          >
            <AnalyticsMetricCard
              icon={Target}
              title="Acceptance rate"
              value={formatPercent(data.quoteAcceptanceRate)}
              description={`${data.quotesAccepted} accepted of ${data.quotesSent} sent`}
              tooltip="Percentage of sent quotes that were accepted."
            />
          </DrillDownLink>
          <DrillDownLink
            href={hasDrillDown ? `${quotesPath}?status=sent` : ""}
            enabled={hasDrillDown}
          >
            <AnalyticsMetricCard
              icon={Eye}
              title="View rate"
              value={formatPercent(data.quoteViewRate)}
              description={`${data.quotesViewed} viewed of ${data.quotesSent} sent`}
              tooltip="Percentage of sent quotes that were opened by customers."
            />
          </DrillDownLink>
          <DrillDownLink
            href={hasDrillDown ? `${quotesPath}?status=rejected` : ""}
            enabled={hasDrillDown}
          >
            <AnalyticsMetricCard
              icon={XCircle}
              title="Rejected"
              value={`${data.quotesRejected}`}
              sparkline={
                sparklines ? (
                  <MiniSparkline
                    points={sparklines.quotesRejected}
                    direction={getDirection(sparklines.quotesRejected)}
                  />
                ) : undefined
              }
              tooltip="Quotes explicitly rejected by customers."
            />
          </DrillDownLink>
        </div>
      </AnalyticsSection>

      <AnalyticsSection eyebrow="Basic" title="Follow-ups">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DrillDownLink href={followUpsPath} enabled={hasDrillDown}>
            <AnalyticsMetricCard
              icon={BellRing}
              title="Active follow-ups"
              value={`${data.activeFollowUps}`}
              description={data.overdueFollowUps > 0 ? `${data.overdueFollowUps} overdue` : "None overdue"}
              tooltip="Follow-up reminders currently pending."
            />
          </DrillDownLink>
          <DrillDownLink href={followUpsPath} enabled={hasDrillDown}>
            <AnalyticsMetricCard
              icon={Clock3}
              title="Overdue"
              value={`${data.overdueFollowUps}`}
              description={data.overdueFollowUps > 0 ? "Need attention now" : "You're on track"}
              tooltip="Follow-ups past their due date."
            />
          </DrillDownLink>
        </div>
      </AnalyticsSection>
    </div>
  );
}
