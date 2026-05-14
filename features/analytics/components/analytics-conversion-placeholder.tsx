import {
  Banknote,
  CheckCircle2,
  Eye,
  FileText,
  TrendingUp,
} from "lucide-react";

import { DashboardStatsGrid } from "@/components/shared/dashboard-layout";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsValueCard } from "@/features/analytics/components/analytics-value-card";
import { AnalyticsFunnelCard } from "@/features/analytics/components/analytics-funnel-card";
import type { PlaceholderConversionData } from "@/features/paywall";
import {
  formatAnalyticsMoney,
  formatAnalyticsPercent,
} from "@/features/analytics/utils";

/**
 * Static placeholder rendering of the conversion analytics tab.
 * Used as the blurred preview content inside PremiumContentBlur
 * when the user lacks the "analyticsConversion" entitlement.
 *
 * This component renders only hardcoded placeholder data — no real
 * user or business data is ever passed to it.
 */
export function AnalyticsConversionPlaceholder({
  data,
  currency,
}: {
  data: PlaceholderConversionData;
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
        />
        <AnalyticsMetricCard
          icon={Eye}
          title="Quote view rate"
          value={formatAnalyticsPercent(data.summary.quoteViewRate)}
          description={`${data.summary.quotesViewed} viewed of ${data.summary.quotesSent} sent`}
        />
        <AnalyticsMetricCard
          icon={CheckCircle2}
          title="Quote to accepted"
          value={formatAnalyticsPercent(data.summary.quoteAcceptanceRate)}
          description={`${data.summary.quotesAccepted} accepted from ${data.summary.quotesSent} sent quotes`}
        />
        <AnalyticsValueCard
          icon={Banknote}
          title="Accepted value"
          value={formatAnalyticsMoney(data.summary.acceptedValueInCents, currency)}
          description="Total value of accepted quotes"
        />
        <AnalyticsValueCard
          icon={TrendingUp}
          title="Avg quote value"
          value={formatAnalyticsMoney(data.summary.averageAcceptedValueInCents, currency)}
          description={`Across ${data.summary.quotesAccepted} accepted quotes`}
        />
      </DashboardStatsGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(18rem,0.42fr)]">
        {/* Simplified trend placeholder — just a skeleton-like card */}
        <div className="h-[362px] rounded-xl border border-border/70 bg-background/72" />
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
    </div>
  );
}
