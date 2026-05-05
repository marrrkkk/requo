"use client";

import {
  Ban,
  Banknote,
  CheckCircle2,
  CircleCheck,
  Eye,
  FileText,
  TrendingUp,
} from "lucide-react";

import dynamic from "next/dynamic";

import { DashboardStatsGrid } from "@/components/shared/dashboard-layout";
import { AnalyticsFormPerformanceTable } from "@/features/analytics/components/analytics-form-performance-table";
import { AnalyticsFunnelCard } from "@/features/analytics/components/analytics-funnel-card";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsValueCard } from "@/features/analytics/components/analytics-value-card";
import { Skeleton } from "@/components/ui/skeleton";

const AnalyticsConversionTrend = dynamic(
  () => import("@/features/analytics/components/analytics-conversion-trend").then((m) => m.AnalyticsConversionTrend),
  { ssr: false, loading: () => <Skeleton className="h-[362px] w-full rounded-xl" /> }
);

const AnalyticsRevenueTrend = dynamic(
  () => import("@/features/analytics/components/analytics-revenue-trend").then((m) => m.AnalyticsRevenueTrend),
  { ssr: false, loading: () => <Skeleton className="h-[362px] w-full rounded-xl" /> }
);
import type { ConversionAnalyticsData } from "@/features/analytics/types";
import {
  formatAnalyticsMoney,
  formatAnalyticsPercent,
} from "@/features/analytics/utils";

export function AnalyticsConversionTab({
  data,
  currency,
}: {
  data: ConversionAnalyticsData;
  currency: string;
}) {


  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid>
        <AnalyticsMetricCard
          icon={FileText}
          title="Inquiry to quote"
          value={formatAnalyticsPercent(data.summary.inquiryToQuoteRate)}
          description={`${data.summary.inquiriesWithQuote} of ${data.summary.inquirySubmissions} recent inquiries reached the quoting stage`}
          tooltip="How many of your recent inquiries were turned into at least one quote."
        />
        <AnalyticsMetricCard
          icon={Eye}
          title="Quote view rate"
          value={formatAnalyticsPercent(data.summary.quoteViewRate)}
          description={`${data.summary.quotesViewed} viewed of ${data.summary.quotesSent} sent — ${data.summary.quotePageViews} total page views`}
          tooltip="Percentage of sent quotes that were opened by customers, plus total public quote page views."
        />
        <AnalyticsMetricCard
          icon={CheckCircle2}
          title="Quote to accepted"
          value={formatAnalyticsPercent(data.summary.quoteAcceptanceRate)}
          description={`${data.summary.quotesAccepted} accepted from ${data.summary.quotesSent} sent quotes`}
          tooltip="Acceptance rate across sent quotes linked to your recent inquiry pipeline."
        />
        <AnalyticsValueCard
          icon={Banknote}
          title="Accepted value"
          value={formatAnalyticsMoney(data.summary.acceptedValueInCents, currency)}
          description="Total value of accepted quotes"
          tooltip="Sum of accepted quote totals across the recent inquiry pipeline."
        />
        <AnalyticsValueCard
          icon={TrendingUp}
          title="Avg quote value"
          value={formatAnalyticsMoney(data.summary.averageAcceptedValueInCents, currency)}
          description={`Across ${data.summary.quotesAccepted} accepted quotes`}
          tooltip="Average total of accepted quotes in the recent pipeline."
        />
        {data.summary.completedValueInCents > 0 ? (
          <AnalyticsValueCard
            icon={CircleCheck}
            title="Completed revenue"
            value={formatAnalyticsMoney(data.summary.completedValueInCents, currency)}
            description={`${data.summary.quotesCompleted} completed of ${data.summary.quotesAccepted} accepted — ${formatAnalyticsPercent(data.summary.acceptedToCompletedRate)}`}
            tooltip="Revenue from accepted quotes where work has been marked completed."
          />
        ) : null}
        {data.summary.canceledAfterAcceptanceValueInCents > 0 ? (
          <AnalyticsValueCard
            icon={Ban}
            title="Canceled after acceptance"
            value={formatAnalyticsMoney(data.summary.canceledAfterAcceptanceValueInCents, currency)}
            description={`${data.summary.quotesCanceledAfterAcceptance} canceled — ${formatAnalyticsPercent(data.summary.acceptedToCanceledRate)} of accepted`}
            tooltip="Revenue lost when customers backed out after accepting a quote."
          />
        ) : null}
      </DashboardStatsGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(18rem,0.42fr)]">
        <AnalyticsConversionTrend points={data.quotesTrend} />
        <AnalyticsFunnelCard
          title="Inquiry handoff funnel"
          description="Follow recent inquiry traffic through quoting, viewing, and acceptance."
          steps={[
            {
              label: "Inquiry submissions",
              count: data.funnel.inquirySubmissions,
              detail: "Recent inquiries entering your pipeline.",
            },
            {
              label: "Inquiries with quotes",
              count: data.funnel.inquiriesWithQuote,
              detail: "Recent inquiries that received at least one quote.",
              conversionRate: data.funnel.inquirySubmissions
                ? data.funnel.inquiriesWithQuote / data.funnel.inquirySubmissions
                : 0,
            },
            {
              label: "Quotes viewed",
              count: data.funnel.quotesViewed,
              detail: "Quotes from that recent pipeline that customers have opened.",
              conversionRate: data.funnel.quotesSent
                ? data.funnel.quotesViewed / data.funnel.quotesSent
                : 0,
            },
            {
              label: "Accepted quotes",
              count: data.funnel.quotesAccepted,
              detail: "Quotes from that same pipeline that customers accepted.",
              conversionRate: data.funnel.quotesSent
                ? data.funnel.quotesAccepted / data.funnel.quotesSent
                : 0,
            },
          ]}
        />
      </div>

      <AnalyticsRevenueTrend points={data.revenueTrend} />

      <AnalyticsFormPerformanceTable rows={data.formPerformance} />
    </div>
  );
}
