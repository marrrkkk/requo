"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardStatsGrid } from "@/components/shared/dashboard-layout";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { AnalyticsFunnel } from "@/features/analytics/components/analytics-funnel";
import { AnalyticsFormTable } from "@/features/analytics/components/analytics-form-table";
import type { FreeAnalyticsData, ProAnalyticsData } from "@/features/analytics/types";
import { computeDelta, formatDelta, formatPercent } from "@/features/analytics/utils";
import {
  CheckCircle2,
  Eye,
  FileText,
  Inbox,
} from "lucide-react";

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
}: {
  free: FreeAnalyticsData;
  pro: ProAnalyticsData;
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

      {/* Form performance table */}
      <AnalyticsFormTable rows={pro.formPerformance} />
    </div>
  );
}
