import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { analyticsSections } from "@/features/analytics/config";
import { AnalyticsTabPanel } from "@/features/analytics/components/analytics-tab-panel";
import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
  hasOperationalBusinessAccess,
} from "@/lib/db/business-access";
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
  prefetch: 'static',
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
  const [session, { slug }, resolvedSearchParams] = await Promise.all([
    requireSession(),
    params,
    searchParams,
  ]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(businessesHubPath);
  }

  if (!hasOperationalBusinessAccess(businessContext.role)) {
    redirect(`/businesses/${businessContext.business.slug}/dashboard`);
  }

  const activeTab = getAnalyticsTab(resolvedSearchParams.tab);
  const businessId = businessContext.business.id;
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

      <AnalyticsTabPanel
        activeTab={activeTab}
        businessId={businessContext.business.id}
        businessSlug={businessSlug}
        currency={currency}
        plan={plan}
      />
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
