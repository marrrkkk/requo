import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdvancedAnalyticsView } from "@/features/analytics/components/advanced-analytics-view";
import { AnalyticsTabbedDashboard } from "@/features/analytics/components/analytics-tabbed-dashboard";
import { BasicAnalyticsView } from "@/features/analytics/components/basic-analytics-view";
import {
  DateRangeSelector,
  type DateRangePreset,
} from "@/features/analytics/components/date-range-selector";
import { LastUpdatedTimestamp } from "@/features/analytics/components/last-updated-timestamp";
import { generateAnalyticsSummary } from "@/features/analytics/ai-summary";
import {
  getBasicSparklineData,
  getBusinessAnalytics,
  getFreeAnalytics,
  getProAnalytics,
} from "@/features/analytics/queries";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { canViewBusinessAnalytics } from "@/lib/business-members";
import { hasFeatureAccess } from "@/lib/plans";
import { createNoIndexMetadata } from "@/lib/seo/site";

type AnalyticsPageProps = {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Map preset string to number of days. */
const PRESET_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Derive the date range (since/until), active preset, and period description
 * from the page's URL searchParams.
 *
 * URL format:
 *  - ?range=7d|30d|90d  → preset
 *  - ?since=YYYY-MM-DD&until=YYYY-MM-DD  → custom range
 *  - (no params)  → defaults to 30 days
 */
function resolveDateRangeFromParams(raw: Record<string, string | string[] | undefined>): {
  since: Date;
  until: Date;
  preset: DateRangePreset;
  customSince?: string;
  customUntil?: string;
  periodDescription: string;
} {
  const now = new Date();
  const rangeParam = typeof raw.range === "string" ? raw.range : undefined;
  const sinceParam = typeof raw.since === "string" ? raw.since : undefined;
  const untilParam = typeof raw.until === "string" ? raw.until : undefined;

  // Custom range
  if (sinceParam && untilParam) {
    const since = new Date(sinceParam);
    const until = new Date(untilParam);

    // Validate; fall back to 30d if invalid
    if (!isNaN(since.getTime()) && !isNaN(until.getTime()) && since < until) {
      // Format dates for description
      const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
      const periodDescription = `${fmt.format(since)} – ${fmt.format(until)}`;
      return {
        since,
        until,
        preset: "custom",
        customSince: sinceParam,
        customUntil: untilParam,
        periodDescription,
      };
    }
  }

  // Preset range
  const days = (rangeParam && PRESET_DAYS[rangeParam]) || 30;
  const preset: DateRangePreset = rangeParam && rangeParam in PRESET_DAYS
    ? (rangeParam as DateRangePreset)
    : "30d";

  const since = new Date(now);
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const until = new Date(now);
  until.setHours(23, 59, 59, 999);

  const periodDescription = `How your inquiry-to-quote pipeline is performing over the last ${days} days.`;

  return { since, until, preset, periodDescription };
}

export default async function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  const [{ businessSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { businessContext, user } = await getAppShellContext(businessSlug);

  if (!canViewBusinessAnalytics(businessContext.role)) {
    redirect(getBusinessDashboardPath(businessContext.business.slug));
  }

  const { business } = businessContext;
  const businessId = business.id;
  const plan = business.plan;

  const hasPerformance = hasFeatureAccess(plan, "analyticsConversion");
  const hasOperations = hasFeatureAccess(plan, "analyticsWorkflow");

  // Derive date range from URL searchParams
  const { since, until, preset, customSince, customUntil, periodDescription } =
    resolveDateRangeFromParams(resolvedSearchParams);

  let freeData = null;
  let proData = null;
  let businessData = null;
  let sparklineData = null;
  let aiSummary: string | null = null;
  let fetchError = false;

  try {
    const results = await Promise.all([
      getFreeAnalytics(businessId, since, until),
      hasPerformance ? getProAnalytics(businessId, since, until) : Promise.resolve(null),
      hasOperations ? getBusinessAnalytics(businessId, since, until) : Promise.resolve(null),
      getBasicSparklineData(businessId, since, until),
    ]);
    freeData = results[0];
    proData = results[1];
    businessData = results[2];
    sparklineData = results[3];

    // Generate AI summary for operations tier (gated behind analyticsWorkflow)
    if (hasOperations && freeData) {
      aiSummary = await generateAnalyticsSummary(
        freeData,
        businessData,
        proData?.priorPeriod,
      );
    }
  } catch {
    fetchError = true;
  }

  const errorFallback = (
    <div className="rounded-xl bg-surface-muted p-6 text-center text-sm text-muted-foreground">
      Unable to load analytics data. Please try again later.
    </div>
  );

  const basicContent = fetchError ? (
    errorFallback
  ) : (
    <BasicAnalyticsView data={freeData!} sparklines={sparklineData} businessSlug={business.slug} />
  );

  const advancedContent = fetchError ? (
    errorFallback
  ) : (
    <AdvancedAnalyticsView
      plan={plan}
      businessId={businessId}
      businessSlug={business.slug}
      currency={business.defaultCurrency}
      data={{ free: freeData!, pro: proData, business: businessData }}
      aiSummary={aiSummary}
      upgradeAction={{
        userId: user.id,
        businessId,
        businessSlug: business.slug,
        currentPlan: plan,
      }}
    />
  );

  return (
    <DashboardPage className="bg-surface-default">
      <PageHeader
        eyebrow="Analytics"
        title="Performance"
        description={periodDescription}
        actions={
          <DateRangeSelector
            currentPreset={preset}
            customSince={customSince}
            customUntil={customUntil}
          />
        }
      />

      <LastUpdatedTimestamp lastUpdatedAt={new Date()} />

      <AnalyticsTabbedDashboard
        basicContent={basicContent}
        advancedContent={advancedContent}
      />
    </DashboardPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return createNoIndexMetadata({
    title: "Analytics",
    description: "Pipeline performance analytics for this business.",
  });
}
