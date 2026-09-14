import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  FileText,
  Inbox,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  LazyAnalyticsOutcomesDonut,
  LazyAnalyticsPipelineAreaChart,
} from "@/components/shared/lazy-recharts";
import { AnalyticsChartCard } from "@/features/analytics/components/analytics-chart-card";
import { AnalyticsFunnelVisual } from "@/features/analytics/components/analytics-funnel-visual";
import { AnalyticsKpiCard } from "@/features/analytics/components/analytics-kpi-card";
import { DrillDownLink } from "@/features/analytics/components/drill-down-link";
import type {
  FreeAnalyticsData,
  FunnelStep,
  MetricSparklineData,
  ProAnalyticsData,
  RevenueSummary,
  TrendPoint,
} from "@/features/analytics/types";
import type { InvoiceOverviewData } from "@/features/invoices/queries";
import type { KpiDeltaLabel } from "@/features/analytics/utils";
import {
  formatMoney,
  formatPercent,
  formatRelativeDelta,
} from "@/features/analytics/utils";
import {
  getBusinessInquiriesPath,
  getBusinessInvoicesPath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";
import { FeatureGate } from "@/features/paywall";
import type { BusinessPlan } from "@/lib/plans/plans";
import type { UpgradeActionProps } from "@/features/paywall/types";

export type OverviewUpgradeAction = UpgradeActionProps;

/**
 * Daily trend points derived from free sparkline arrays for businesses
 * without Performance access. Pro users get the 12-week rollup trend.
 */
function buildDailyTrendPoints(
  since: Date,
  until: Date,
  sparklines: MetricSparklineData,
): TrendPoint[] {
  const start = new Date(since);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(until);
  end.setUTCHours(0, 0, 0, 0);
  const dayCount =
    Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1) || 1;
  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

  return Array.from({ length: dayCount }).map((_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      label: fmt.format(d),
      weekStart: d.toISOString().slice(0, 10),
      formViews: sparklines.formViews[i] ?? 0,
      inquirySubmissions: sparklines.inquirySubmissions[i] ?? 0,
      quotesSent: sparklines.quotesSent[i] ?? 0,
      acceptedQuotes: sparklines.quotesAccepted[i] ?? 0,
    };
  });
}

export function BasicAnalyticsView({
  data,
  sparklines,
  businessSlug,
  since,
  until,
  currency,
  plan,
  hasPerformance,
  hasOperations,
  pro,
  revenue,
  revenueDelta,
  invoiceOverview,
  upgradeAction,
}: {
  data: FreeAnalyticsData;
  sparklines?: MetricSparklineData | null;
  businessSlug?: string;
  since: Date;
  until: Date;
  currency: string;
  plan: BusinessPlan;
  hasPerformance: boolean;
  hasOperations: boolean;
  pro?: ProAnalyticsData | null;
  revenue?: RevenueSummary | null;
  revenueDelta?: KpiDeltaLabel | null;
  invoiceOverview?: InvoiceOverviewData | null;
  upgradeAction?: OverviewUpgradeAction;
}) {
  const hasDrillDown = !!businessSlug;
  const inquiriesPath = businessSlug ? getBusinessInquiriesPath(businessSlug) : "";
  const quotesPath = businessSlug ? getBusinessQuotesPath(businessSlug) : "";
  const invoicesPath = businessSlug ? getBusinessInvoicesPath(businessSlug) : "";

  const inquiriesDelta = pro
    ? formatRelativeDelta(data.inquirySubmissions, pro.priorPeriod.inquirySubmissions)
    : null;
  const quotesDelta = pro
    ? formatRelativeDelta(data.quotesSent, pro.priorPeriod.quotesSent)
    : null;
  const wonDelta = pro
    ? formatRelativeDelta(data.quotesAccepted, pro.priorPeriod.quotesAccepted)
    : null;

  const funnelSteps: FunnelStep[] = pro?.funnel ?? [
    { label: "Visitors", count: data.uniqueVisitors },
    { label: "Submissions", count: data.inquirySubmissions },
    { label: "Quoted", count: data.inquiriesWithQuote },
    { label: "Accepted", count: data.quotesAccepted },
  ];

  const trendPoints: TrendPoint[] =
    pro?.trend ?? (sparklines ? buildDailyTrendPoints(since, until, sparklines) : []);

  const invoiceCurrency = invoiceOverview?.currency ?? currency;
  const hasInvoices =
    invoiceOverview != null &&
    (invoiceOverview.outstandingCount > 0 ||
      invoiceOverview.counts.draft > 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
          Pipeline overview
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          How inquiries turn into quotes, wins, and revenue for the selected time range.
        </p>
      </div>

      {/* Hero KPI cards — each number appears once */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <DrillDownLink href={inquiriesPath} enabled={hasDrillDown}>
          <AnalyticsKpiCard
            icon={Inbox}
            title="Inquiries"
            value={`${data.inquirySubmissions}`}
            delta={inquiriesDelta}
            description={`${formatPercent(data.formConversionRate)} of visitors submitted`}
            tooltip="Total inquiries received this period."
          />
        </DrillDownLink>
        <DrillDownLink
          href={hasDrillDown ? `${quotesPath}?status=sent` : ""}
          enabled={hasDrillDown}
        >
          <AnalyticsKpiCard
            icon={FileText}
            title="Quotes sent"
            value={`${data.quotesSent}`}
            delta={quotesDelta}
            description={`${data.quotesViewed} viewed by customers`}
            tooltip="Quotes sent to customers."
          />
        </DrillDownLink>
        <DrillDownLink
          href={hasDrillDown ? `${quotesPath}?status=accepted` : ""}
          enabled={hasDrillDown}
        >
          <AnalyticsKpiCard
            icon={CheckCircle2}
            title="Won"
            value={`${data.quotesAccepted}`}
            delta={wonDelta}
            description={`${formatPercent(data.quoteAcceptanceRate)} acceptance rate`}
            tooltip="Quotes accepted by customers."
          />
        </DrillDownLink>
        {hasOperations && revenue ? (
          <AnalyticsKpiCard
            icon={Banknote}
            title="Revenue won"
            value={formatMoney(revenue.acceptedValueInCents, currency)}
            delta={revenueDelta}
            description="Accepted quote value"
            tooltip="Accepted quote value for this period."
          />
        ) : (
          <FeatureGate
            feature="analyticsWorkflow"
            plan={plan}
            variant="block"
            upgradeAction={upgradeAction}
          >
            <AnalyticsKpiCard
              icon={Banknote}
              title="Revenue won"
              value="—"
              lockedBadge={<Badge variant="secondary">Pro</Badge>}
              tooltip="Accepted quote value for this period."
            />
          </FeatureGate>
        )}
      </div>

      {/* Funnel + outcomes */}
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
        <AnalyticsChartCard title="Acquisition funnel">
          <AnalyticsFunnelVisual steps={funnelSteps} />
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Quote outcomes">
          <LazyAnalyticsOutcomesDonut data={data} />
        </AnalyticsChartCard>
      </div>

      {/* Pipeline over time — the only volume-over-time chart in overview */}
      <AnalyticsChartCard title="Pipeline trend">
        <LazyAnalyticsPipelineAreaChart points={trendPoints} />
      </AnalyticsChartCard>

      {/* Money in — the only place surfacing invoice balances */}
      <AnalyticsChartCard title="Money in">
        {hasInvoices && invoiceOverview ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 xl:grid-cols-3">
            <DrillDownLink href={invoicesPath} enabled={hasDrillDown}>
              <AnalyticsKpiCard
                variant="flat"
                icon={Wallet}
                title="Outstanding"
                value={formatMoney(invoiceOverview.outstandingInCents, invoiceCurrency)}
                description={`${invoiceOverview.outstandingCount} open invoice${invoiceOverview.outstandingCount === 1 ? "" : "s"}`}
                tooltip="Total balance still owed across open invoices."
              />
            </DrillDownLink>
            <DrillDownLink
              href={hasDrillDown ? `${invoicesPath}?status=overdue` : ""}
              enabled={hasDrillDown}
            >
              <AnalyticsKpiCard
                variant="flat"
                icon={AlertTriangle}
                title="Overdue"
                value={`${invoiceOverview.counts.overdue}`}
                valueClassName={
                  invoiceOverview.counts.overdue > 0 ? "text-destructive" : undefined
                }
                description={
                  invoiceOverview.counts.overdue > 0
                    ? "Past due — follow up now"
                    : "Nothing past due"
                }
                tooltip="Invoices past their due date."
              />
            </DrillDownLink>
            <DrillDownLink href={invoicesPath} enabled={hasDrillDown}>
              <AnalyticsKpiCard
                variant="flat"
                icon={CalendarClock}
                title="Due soon"
                value={`${invoiceOverview.counts.dueSoon}`}
                description="Due within 7 days"
                tooltip="Open invoices due within the next 7 days."
              />
            </DrillDownLink>
          </div>
        ) : (
          <DrillDownLink href={invoicesPath} enabled={hasDrillDown}>
            <p className="text-sm leading-6 text-muted-foreground">
              No invoices yet — invoice accepted work to track what customers owe here.
            </p>
          </DrillDownLink>
        )}
      </AnalyticsChartCard>

      {!hasPerformance || !hasOperations ? (
        <p className="text-xs text-muted-foreground">
          Period comparisons and revenue unlock on Pro.
        </p>
      ) : null}
    </div>
  );
}
