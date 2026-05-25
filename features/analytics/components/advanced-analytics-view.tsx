import { Suspense } from "react";

import { DashboardSection } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsBusinessPanel } from "@/features/analytics/components/analytics-business-panel";
import { AnalyticsProPanel } from "@/features/analytics/components/analytics-pro-panel";
import type {
  BusinessAnalyticsData,
  FreeAnalyticsData,
  ProAnalyticsData,
} from "@/features/analytics/types";
import { PremiumContentBlur } from "@/features/paywall";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan } from "@/lib/plans/plans";

type AdvancedAnalyticsViewProps = {
  plan: BusinessPlan;
  businessId: string;
  businessSlug: string;
  currency: string;
  data: {
    free: FreeAnalyticsData;
    pro: ProAnalyticsData | null;
    business: BusinessAnalyticsData | null;
  };
  /** AI-generated one-sentence summary for the operations panel. */
  aiSummary?: string | null;
  /** Upgrade action context for the paywall CTA */
  upgradeAction?: {
    userId: string;
    businessId: string;
    businessSlug: string;
    currentPlan: BusinessPlan;
  };
};

function ProSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4 bg-surface-muted rounded-xl p-4">
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
    <div className="flex flex-col gap-4 bg-surface-muted rounded-xl p-4">
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

export function AdvancedAnalyticsView({
  plan,
  businessId: _businessId,
  businessSlug,
  currency,
  data,
  aiSummary,
  upgradeAction,
}: AdvancedAnalyticsViewProps) {
  const hasPerformanceAccess = hasFeatureAccess(plan, "analyticsConversion");
  const hasOperationsAccess = hasFeatureAccess(plan, "analyticsWorkflow");

  // Free plan: show paywall for the entire advanced section
  if (!hasPerformanceAccess && !hasOperationsAccess) {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Performance section */}
      {hasPerformanceAccess && data.pro ? (
        <Suspense fallback={<ProSectionSkeleton />}>
          <DashboardSection
            title={<span className="meta-label">Performance</span>}
            className="section-panel"
          >
            <AnalyticsProPanel free={data.free} pro={data.pro} />
          </DashboardSection>
        </Suspense>
      ) : null}

      {/* Operations section */}
      {hasOperationsAccess && data.business ? (
        <Suspense fallback={<BusinessSectionSkeleton />}>
          <DashboardSection
            title={<span className="meta-label">Operations</span>}
            className="section-panel"
          >
            <AnalyticsBusinessPanel data={data.business} currency={currency} aiSummary={aiSummary} businessSlug={businessSlug} />
          </DashboardSection>
        </Suspense>
      ) : null}
    </div>
  );
}
