"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardStatsGrid } from "@/components/shared/dashboard-layout";
import { AnalyticsChartCard } from "@/features/analytics/components/analytics-chart-card";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsFunnel } from "@/features/analytics/components/analytics-funnel";
import type { FreeAnalyticsData, ProAnalyticsData, ReferrerSource } from "@/features/analytics/types";
import { computeDelta, formatDelta, formatPercent } from "@/features/analytics/utils";
import {
  CheckCircle2,
  Eye,
  FileText,
  Globe,
  Inbox,
} from "lucide-react";

// Client-only chart: relies on ResizeObserver/DOM measurement via Recharts.
const AnalyticsTrendChart = dynamic(
  () =>
    import("@/features/analytics/components/analytics-trend-chart").then(
      (m) => m.AnalyticsTrendChart,
    ),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> },
);

export function AnalyticsProPanel({
  free,
  pro,
  topSources,
}: {
  free: FreeAnalyticsData;
  pro: ProAnalyticsData;
  topSources?: ReferrerSource[] | null;
}) {
  const fvDelta = computeDelta(free.formViews, pro.priorPeriod.formViews);
  const inqDelta = computeDelta(free.inquirySubmissions, pro.priorPeriod.inquirySubmissions);
  const sentDelta = computeDelta(free.quotesSent, pro.priorPeriod.quotesSent);
  const accDelta = computeDelta(free.quotesAccepted, pro.priorPeriod.quotesAccepted);

  return (
    <div className="flex flex-col gap-6">
      {/* Top metrics with deltas */}
      <DashboardStatsGrid>
        <AnalyticsMetricCard
          icon={Eye}
          title="Form views"
          value={`${free.formViews}`}
          description={`${free.uniqueVisitors} unique visitors`}
          delta={{ label: `${formatDelta(fvDelta)} vs prior 30d`, direction: fvDelta.direction }}
        />
        <AnalyticsMetricCard
          icon={Inbox}
          title="Inquiries"
          value={`${free.inquirySubmissions}`}
          description={`${formatPercent(free.formConversionRate)} conversion`}
          delta={{ label: `${formatDelta(inqDelta)} vs prior 30d`, direction: inqDelta.direction }}
        />
        <AnalyticsMetricCard
          icon={FileText}
          title="Quotes sent"
          value={`${free.quotesSent}`}
          description={`${free.quotesViewed} viewed`}
          delta={{ label: `${formatDelta(sentDelta)} vs prior 30d`, direction: sentDelta.direction }}
        />
        <AnalyticsMetricCard
          icon={CheckCircle2}
          title="Accepted"
          value={`${free.quotesAccepted}`}
          description={`${formatPercent(free.quoteAcceptanceRate)} rate`}
          delta={{ label: `${formatDelta(accDelta)} vs prior 30d`, direction: accDelta.direction }}
        />
      </DashboardStatsGrid>

      {/* Trend + Funnel */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.38fr)]">
        <AnalyticsTrendChart points={pro.trend} />
        <AnalyticsFunnel steps={pro.funnel} />
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
                className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary">
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
