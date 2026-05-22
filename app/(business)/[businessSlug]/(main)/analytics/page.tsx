import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardAnalyticsSkeleton } from "@/components/shell/dashboard-analytics-skeleton";
import { AnalyticsDashboard } from "@/features/analytics/components/analytics-dashboard";
import { canViewBusinessAnalytics } from "@/lib/business-members";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessDashboardPath } from "@/features/businesses/routes";

type AnalyticsPageProps = {
  params: Promise<{ businessSlug: string }>;
};

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);

  if (!canViewBusinessAnalytics(businessContext.role)) {
    redirect(getBusinessDashboardPath(businessContext.business.slug));
  }

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Analytics"
        title="Performance"
        description="How your inquiry-to-quote pipeline is performing over the last 30 days."
      />

      <Suspense fallback={<DashboardAnalyticsSkeleton />}>
        <AnalyticsDashboard
          businessId={businessContext.business.id}
          businessSlug={businessContext.business.slug}
          currency={businessContext.business.defaultCurrency}
          plan={businessContext.business.plan}
        />
      </Suspense>
    </DashboardPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return createNoIndexMetadata({
    title: "Analytics",
    description: "Pipeline performance analytics for this business.",
  });
}
