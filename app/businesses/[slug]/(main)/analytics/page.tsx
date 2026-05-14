import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardAnalyticsSkeleton } from "@/components/shell/dashboard-analytics-skeleton";
import { analyticsSections } from "@/features/analytics/config";
import { AnalyticsTabPanel } from "@/features/analytics/components/analytics-tab-panel";
import { canViewBusinessAnalytics } from "@/lib/business-members";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

type AnalyticsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const analyticsTabIds = [
  analyticsSections.overview.id,
  analyticsSections.conversion.id,
  analyticsSections.workflow.id,
] as const;

type AnalyticsTabId = (typeof analyticsTabIds)[number];

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

function getAnalyticsTab(
  value: string | string[] | undefined,
): AnalyticsTabId {
  const normalized = typeof value === "string" ? value : value?.[0];

  return analyticsTabIds.includes(normalized as AnalyticsTabId)
    ? (normalized as AnalyticsTabId)
    : analyticsSections.overview.id;
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: AnalyticsPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { businessContext } = await getAppShellContext(slug);

  if (!canViewBusinessAnalytics(businessContext.role)) {
    redirect(`/businesses/${businessContext.business.slug}/dashboard`);
  }

  const activeTab = getAnalyticsTab(resolvedSearchParams.tab);
  const businessSlug = businessContext.business.slug;
  const plan = businessContext.business.plan;
  const currency = businessContext.business.defaultCurrency;

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Analytics"
        title="Performance analytics"
        description="Track how inquiry form traffic turns into quotes, customer decisions, and follow-through."
      />

      <Suspense
        fallback={<DashboardAnalyticsSkeleton />}
      >
        <AnalyticsTabPanel
          activeTab={activeTab}
          businessId={businessContext.business.id}
          businessSlug={businessSlug}
          currency={currency}
          plan={plan}
        />
      </Suspense>
    </DashboardPage>
  );
}

export async function generateMetadata({
  searchParams,
}: AnalyticsPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const activeTab = getAnalyticsTab(resolvedSearchParams.tab);
  const tabLabel =
    activeTab === analyticsSections.overview.id
      ? analyticsSections.overview.label
      : activeTab === analyticsSections.conversion.id
        ? analyticsSections.conversion.label
        : analyticsSections.workflow.label;

  return createNoIndexMetadata({
    title: `Analytics · ${tabLabel}`,
    description: "Conversion and workflow analytics for this business.",
  });
}
