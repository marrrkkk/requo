import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { DashboardStatsGrid } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsFreeSection } from "@/features/analytics/components/analytics-free-section";
import { AnalyticsProSection } from "@/features/analytics/components/analytics-pro-section";
import { AnalyticsBusinessSection } from "@/features/analytics/components/analytics-business-section";
import { canViewBusinessAnalytics } from "@/lib/business-members";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessDashboardPath } from "@/features/businesses/routes";

function FreeStatsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-3 w-32 rounded-md mb-4" />
        <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </DashboardStatsGrid>
      </div>
      <div>
        <Skeleton className="h-3 w-32 rounded-md mb-4" />
        <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </DashboardStatsGrid>
      </div>
    </div>
  );
}

function ProSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[280px] rounded-xl" />
    </div>
  );
}

function BusinessSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}

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

      <div className="flex flex-col gap-10">
        {/* Free tier stats — streams independently */}
        <section>
          <Suspense fallback={<FreeStatsSkeleton />}>
            <AnalyticsFreeSection businessId={businessContext.business.id} />
          </Suspense>
        </section>

        {/* Pro tier — trends, funnel, form breakdown */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Performance
            </h2>
            <span className="meta-label">Pro</span>
          </div>
          <Suspense fallback={<ProSectionSkeleton />}>
            <AnalyticsProSection
              businessId={businessContext.business.id}
              businessSlug={businessContext.business.slug}
              plan={businessContext.business.plan}
            />
          </Suspense>
        </section>

        {/* Business tier — workflow, timing, alerts */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Operations
            </h2>
            <span className="meta-label">Business</span>
          </div>
          <Suspense fallback={<BusinessSectionSkeleton />}>
            <AnalyticsBusinessSection
              businessId={businessContext.business.id}
              businessSlug={businessContext.business.slug}
              plan={businessContext.business.plan}
              currency={businessContext.business.defaultCurrency}
            />
          </Suspense>
        </section>
      </div>
    </DashboardPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return createNoIndexMetadata({
    title: "Analytics",
    description: "Pipeline performance analytics for this business.",
  });
}
