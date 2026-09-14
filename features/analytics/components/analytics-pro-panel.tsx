"use client";

import { LazyAnalyticsTrendChart } from "@/components/shared/lazy-recharts";
import { AnalyticsChartCard } from "@/features/analytics/components/analytics-chart-card";
import { AnalyticsFunnelVisual } from "@/features/analytics/components/analytics-funnel-visual";
import { AnalyticsKpiCard } from "@/features/analytics/components/analytics-kpi-card";
import type { FreeAnalyticsData, ProAnalyticsData, ReferrerSource } from "@/features/analytics/types";
import { formatPercent, formatRelativeDelta } from "@/features/analytics/utils";
import {
  CheckCircle2,
  Eye,
  FileText,
  Globe,
  Inbox,
} from "lucide-react";

export function AnalyticsProPanel({
  free,
  pro,
  topSources,
}: {
  free: FreeAnalyticsData;
  pro: ProAnalyticsData;
  topSources?: ReferrerSource[] | null;
}) {
  const fvDelta = formatRelativeDelta(free.formViews, pro.priorPeriod.formViews);
  const inqDelta = formatRelativeDelta(free.inquirySubmissions, pro.priorPeriod.inquirySubmissions);
  const sentDelta = formatRelativeDelta(free.quotesSent, pro.priorPeriod.quotesSent);
  const accDelta = formatRelativeDelta(free.quotesAccepted, pro.priorPeriod.quotesAccepted);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Top metrics with deltas */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <AnalyticsKpiCard
          icon={Eye}
          title="Form views"
          value={`${free.formViews}`}
          description={`${free.uniqueVisitors} unique visitors`}
          delta={fvDelta}
        />
        <AnalyticsKpiCard
          icon={Inbox}
          title="Inquiries"
          value={`${free.inquirySubmissions}`}
          description={`${formatPercent(free.formConversionRate)} conversion`}
          delta={inqDelta}
        />
        <AnalyticsKpiCard
          icon={FileText}
          title="Quotes sent"
          value={`${free.quotesSent}`}
          description={`${free.quotesViewed} viewed`}
          delta={sentDelta}
        />
        <AnalyticsKpiCard
          icon={CheckCircle2}
          title="Accepted"
          value={`${free.quotesAccepted}`}
          description={`${formatPercent(free.quoteAcceptanceRate)} rate`}
          delta={accDelta}
        />
      </div>

      {/* Trend + Funnel */}
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <LazyAnalyticsTrendChart points={pro.trend} />
        <AnalyticsChartCard title="Inquiry funnel">
          <AnalyticsFunnelVisual steps={pro.funnel} />
        </AnalyticsChartCard>
      </div>

      {/* Top traffic sources */}
      {topSources && topSources.length > 0 ? (
        <AnalyticsChartCard
          title="Top sources"
          description="Top referrer domains driving form traffic."
        >
          <div className="flex flex-col gap-2">
            {topSources.map((source, i) => (
              <div
                key={source.domain}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {source.domain}
                  </span>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground ml-3">
                  {source.count.toLocaleString()} visits
                </span>
              </div>
            ))}
          </div>
        </AnalyticsChartCard>
      ) : null}
    </div>
  );
}
