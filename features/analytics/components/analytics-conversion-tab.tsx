import {
  ArrowUpRight,
  Banknote,
  CircleCheckBig,
  FileText,
  Target,
} from "lucide-react";


import {
  DashboardDetailLayout,
  DashboardEmptyState,
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
import { AnalyticsConversionTrend } from "@/features/analytics/components/analytics-conversion-trend";
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
  const hasQuoteData =
    data.acceptedValueInCents > 0 ||
    data.pendingValueInCents > 0 ||
    data.rejectedValueInCents > 0 ||
    data.quoteToAcceptanceRate > 0;

  if (!hasQuoteData && data.inquiryToQuoteRate === 0) {
    return (
      <DashboardEmptyState
        description="Send a few quotes to see your conversion funnel and pipeline value here."
        icon={Target}
        title="No conversion data yet"
        variant="section"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid>
        <AnalyticsMetricCard
          icon={ArrowUpRight}
          title="Inquiry → quote"
          value={formatAnalyticsPercent(data.inquiryToQuoteRate)}
          description="Inquiries that received a quote"
          tooltip="How many of your inquiries were turned into at least one quote."
        />
        <AnalyticsMetricCard
          icon={CircleCheckBig}
          title="Quote → accepted"
          value={formatAnalyticsPercent(data.quoteToAcceptanceRate)}
          description="Of sent quotes, how many accepted"
          tooltip="Acceptance rate across all quotes you've sent to customers."
        />
        <AnalyticsValueCard
          icon={Banknote}
          title="Accepted value"
          value={formatAnalyticsMoney(data.acceptedValueInCents, currency)}
          description="Total value of accepted quotes"
          tooltip="Sum of all quote totals where the customer accepted."
        />
        <AnalyticsValueCard
          icon={FileText}
          title="Avg accepted"
          value={
            data.averageAcceptedValueInCents > 0
              ? formatAnalyticsMoney(data.averageAcceptedValueInCents, currency)
              : "—"
          }
          tooltip="Average total per accepted quote."
        />
      </DashboardStatsGrid>

      <DashboardDetailLayout>
        <AnalyticsConversionTrend points={data.quotesStatusTrend} />

        <DashboardSidebarStack>
          <PipelineCard
            accepted={data.acceptedValueInCents}
            pending={data.pendingValueInCents}
            rejected={data.rejectedValueInCents}
            currency={currency}
          />
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </div>
  );
}

function PipelineCard({
  accepted,
  pending,
  rejected,
  currency,
}: {
  accepted: number;
  pending: number;
  rejected: number;
  currency: string;
}) {
  const total = accepted + pending + rejected;
  const maxValue = Math.max(accepted, pending, rejected, 1);

  const segments = [
    {
      label: "Pending",
      value: pending,
      color: "bg-cyan-500/65 dark:bg-cyan-400/60",
    },
    {
      label: "Accepted",
      value: accepted,
      color: "bg-emerald-500/75 dark:bg-emerald-400/70",
    },
    {
      label: "Rejected",
      value: rejected,
      color: "bg-red-400/70 dark:bg-red-400/60",
    },
  ];

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle>Pipeline value</CardTitle>
        <CardDescription>
          Total quote value by current status.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Segmented bar */}
        {total > 0 ? (
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/30">
            {segments.map(
              (seg) =>
                seg.value > 0 ? (
                  <div
                    className={`h-full ${seg.color} transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full`}
                    key={seg.label}
                    style={{ width: `${(seg.value / total) * 100}%` }}
                  />
                ) : null,
            )}
          </div>
        ) : null}

        {/* Value rows */}
        <div className="flex flex-col gap-2.5">
          {segments.map((seg) => (
            <div className="soft-panel p-3.5 shadow-none" key={seg.label}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block size-2.5 rounded-full ${seg.color}`}
                  />
                  <p className="text-sm font-medium text-foreground">
                    {seg.label}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums tracking-tight text-foreground">
                  {formatAnalyticsMoney(seg.value, currency)}
                </p>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted/30">
                <div
                  className={`h-full rounded-full ${seg.color} transition-all duration-500 ease-out`}
                  style={{
                    width: `${Math.max(seg.value > 0 ? 3 : 0, Math.round((seg.value / maxValue) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
