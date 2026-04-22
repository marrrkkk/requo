import {
  Banknote,
  CheckCircle2,
  Eye,
  FileText,
  Target,
} from "lucide-react";

import {
  DashboardEmptyState,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { AnalyticsConversionTrend } from "@/features/analytics/components/analytics-conversion-trend";
import { AnalyticsFormPerformanceTable } from "@/features/analytics/components/analytics-form-performance-table";
import { AnalyticsFunnelCard } from "@/features/analytics/components/analytics-funnel-card";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsValueCard } from "@/features/analytics/components/analytics-value-card";
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
          title="Quotes viewed"
          value={`${data.summary.quotesViewed}`}
          description={`${data.summary.quotePageViews} public quote page views recorded from those inquiries`}
          tooltip="Distinct quotes that have been opened by customers, plus total public quote page views recorded in the last 30 days."
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

      <AnalyticsFormPerformanceTable rows={data.formPerformance} />
    </div>
  );
}
