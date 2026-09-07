import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedAnalyticsView } from "@/features/analytics/components/advanced-analytics-view";
import { AnalyticsTabsShell } from "@/features/analytics/components/analytics-tabs-shell";
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
  getRevenueForecast,
  getTopSources,
} from "@/features/analytics/queries";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { canViewBusinessAnalytics } from "@/lib/business-members";
import { hasFeatureAccess } from "@/lib/plans";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { FirstVisitTip } from "@/features/onboarding/components/first-visit-tip";
import { featureTips } from "@/features/onboarding/feature-tips";
import { PremiumContentBlur } from "@/features/paywall";

export const instant = true;

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

/**
 * Analytics page — returns the structural shell synchronously.
 *
 * Progressive regions (outermost first):
 * 1. Header + date-range controls (searchParams only — no database reads).
 * 2. Tabs shell (auth + role + plan — fast, no analytics queries).
 * 3. Core metrics (free analytics + sparklines).
 * 4. Advanced charts + AI summary (plan-gated queries; the LLM summary
 *    streams in place behind its own boundary so it never holds back
 *    the charts).
 *
 * Each region has its own Suspense fallback and selective error isolation,
 * so one slow or failed query never blocks the rest of the page. Plan
 * gating and tenant scoping stay server-side inside each region.
 */
export default function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  return (
    <DashboardPage className="bg-surface-default">
      <Suspense fallback={<AnalyticsHeaderSkeleton />}>
        <AnalyticsHeaderRegion searchParams={searchParams} />
      </Suspense>

      <FirstVisitTip {...featureTips.analytics} className="mb-4" />

      <Suspense fallback={<AnalyticsTabsSkeleton />}>
        <RegionErrorBoundary fallback={<AnalyticsErrorFallback />}>
          <AnalyticsTabsRegion params={params} searchParams={searchParams} />
        </RegionErrorBoundary>
      </Suspense>
    </DashboardPage>
  );
}

// ---------------------------------------------------------------------------
// Header region — searchParams only, no database reads
// ---------------------------------------------------------------------------

async function AnalyticsHeaderRegion({
  searchParams,
}: Pick<AnalyticsPageProps, "searchParams">) {
  const resolvedSearchParams = await searchParams;
  const { preset, customSince, customUntil, periodDescription } =
    resolveDateRangeFromParams(resolvedSearchParams);

  return (
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
  );
}

// ---------------------------------------------------------------------------
// Tabs region — auth, role gate, and plan only (no analytics queries)
// ---------------------------------------------------------------------------

async function AnalyticsTabsRegion({ params, searchParams }: AnalyticsPageProps) {
  const [{ businessSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { user, businessContext } = await getAppShellContext(businessSlug);

  if (!canViewBusinessAnalytics(businessContext.role)) {
    redirect(getBusinessDashboardPath(businessContext.business.slug));
  }

  const { business } = businessContext;
  const businessId = business.id;
  const plan = business.plan;

  const hasPerformance = hasFeatureAccess(plan, "analyticsConversion");
  const hasOperations = hasFeatureAccess(plan, "analyticsWorkflow");
  const canViewAdvanced = hasPerformance || hasOperations;

  const { since, until } = resolveDateRangeFromParams(resolvedSearchParams);

  const upgradeAction = {
    userId: user.id,
    businessId,
    businessSlug: business.slug,
    currentPlan: plan,
  } as const;

  return (
    <>
      <LastUpdatedTimestamp lastUpdatedAt={new Date()} />

      <AnalyticsTabsShell
        basicContent={
          <Suspense fallback={<CoreAnalyticsSkeleton />}>
            <RegionErrorBoundary fallback={<AnalyticsErrorFallback />}>
              <CoreAnalyticsRegion
                businessId={businessId}
                businessSlug={business.slug}
                since={since}
                until={until}
              />
            </RegionErrorBoundary>
          </Suspense>
        }
        advancedContent={
          <Suspense fallback={<AdvancedAnalyticsSkeleton />}>
            <RegionErrorBoundary fallback={<AnalyticsErrorFallback />}>
              <AdvancedAnalyticsRegion
                businessId={businessId}
                businessSlug={business.slug}
                currency={business.defaultCurrency}
                plan={plan}
                since={since}
                until={until}
                hasPerformance={hasPerformance}
                hasOperations={hasOperations}
                upgradeAction={{ ...upgradeAction }}
              />
            </RegionErrorBoundary>
          </Suspense>
        }
        defaultTab={canViewAdvanced ? "advanced" : "basic"}
        canAccessAdvanced={canViewAdvanced}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Core region — free analytics + sparklines (fast, ungated)
// ---------------------------------------------------------------------------

async function CoreAnalyticsRegion({
  businessId,
  businessSlug,
  since,
  until,
}: {
  businessId: string;
  businessSlug: string;
  since: Date;
  until: Date;
}) {
  const [freeData, sparklineData] = await Promise.all([
    getFreeAnalytics(businessId, since, until),
    getBasicSparklineData(businessId, since, until),
  ]);

  return (
    <BasicAnalyticsView
      data={freeData}
      sparklines={sparklineData}
      businessSlug={businessSlug}
      since={since}
      until={until}
    />
  );
}

// ---------------------------------------------------------------------------
// Advanced region — plan-gated queries; AI summary streams in place
// ---------------------------------------------------------------------------

async function AdvancedAnalyticsRegion({
  businessId,
  businessSlug,
  currency,
  plan,
  since,
  until,
  hasPerformance,
  hasOperations,
  upgradeAction,
}: {
  businessId: string;
  businessSlug: string;
  currency: string;
  plan: Parameters<typeof hasFeatureAccess>[0];
  since: Date;
  until: Date;
  hasPerformance: boolean;
  hasOperations: boolean;
  upgradeAction: {
    userId: string;
    businessId: string;
    businessSlug: string;
    currentPlan: Parameters<typeof hasFeatureAccess>[0];
  };
}) {
  // Plan gate stays server-side: free users see the upgrade surface, and no
  // restricted query runs for them.
  if (!hasPerformance && !hasOperations) {
    return (
      <PremiumContentBlur
        feature="analyticsConversion"
        plan={plan}
        upgradeAction={upgradeAction}
      >
        <div />
      </PremiumContentBlur>
    );
  }

  const [freeData, proData, businessData, topSourcesData, revenueForecastData] =
    await Promise.all([
      getFreeAnalytics(businessId, since, until),
      hasPerformance ? getProAnalytics(businessId, since, until) : Promise.resolve(null),
      hasOperations ? getBusinessAnalytics(businessId, since, until) : Promise.resolve(null),
      hasPerformance ? getTopSources(businessId, since, until) : Promise.resolve(null),
      hasOperations ? getRevenueForecast(businessId) : Promise.resolve(null),
    ]);

  // Kick off the LLM summary without awaiting it: the charts paint first and
  // the insight card streams in place via `aiSummaryPromise`.
  const aiSummaryPromise =
    hasOperations && freeData
      ? generateAnalyticsSummary(freeData, businessData, proData?.priorPeriod)
      : Promise.resolve(null);

  return (
    <AdvancedAnalyticsView
      plan={plan}
      businessId={businessId}
      businessSlug={businessSlug}
      currency={currency}
      data={{ free: freeData, pro: proData, business: businessData }}
      aiSummaryPromise={aiSummaryPromise}
      revenueForecast={revenueForecastData}
      topSources={topSourcesData}
      upgradeAction={upgradeAction}
    />
  );
}

// ---------------------------------------------------------------------------
// Skeletons and error fallback (reuse existing visual language)
// ---------------------------------------------------------------------------

function AnalyticsHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-4 w-72 max-w-full rounded-md" />
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function AnalyticsTabsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg bg-surface-muted p-1">
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <CoreAnalyticsSkeleton />
    </div>
  );
}

function CoreAnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="mb-4 h-3 w-36 rounded-md" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-28 flex-col justify-between rounded-lg border bg-card p-5"
            >
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-[280px] w-full rounded-xl" />
    </div>
  );
}

function AdvancedAnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl bg-surface-muted p-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[280px] rounded-xl" />
      </div>
    </div>
  );
}

function AnalyticsErrorFallback() {
  return (
    <div className="rounded-xl bg-surface-muted p-6 text-center text-sm text-muted-foreground">
      Unable to load analytics data. Please try again later.
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return createNoIndexMetadata({
    title: "Analytics",
    description: "Pipeline performance analytics for this business.",
  });
}
