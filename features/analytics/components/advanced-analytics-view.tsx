import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsBusinessPanel } from "@/features/analytics/components/analytics-business-panel";
import { AnalyticsFormTable } from "@/features/analytics/components/analytics-form-table";
import { AnalyticsProPanel } from "@/features/analytics/components/analytics-pro-panel";
import { AnalyticsSection } from "@/features/analytics/components/analytics-section";
import type {
  BusinessAnalyticsData,
  FreeAnalyticsData,
  ProAnalyticsData,
  ReferrerSource,
  RevenueForecast,
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
  /** Revenue forecast data for operations panel. */
  revenueForecast?: RevenueForecast | null;
  /** Top referrer sources for performance panel. */
  topSources?: ReferrerSource[] | null;
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
  revenueForecast,
  topSources,
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
          <AnalyticsSection
            eyebrow="Advanced"
            title="Performance"
            description="Trends, funnel drop-offs, and form-level performance."
          >
            <AnalyticsProPanel free={data.free} pro={data.pro} topSources={topSources} />
          </AnalyticsSection>
        </Suspense>
      ) : null}

      {/* Operations section */}
      {hasOperationsAccess && data.business ? (
        <Suspense fallback={<BusinessSectionSkeleton />}>
          <AnalyticsSection
            eyebrow="Advanced"
            title="Operations"
            description="Timing, follow-up discipline, and revenue signals."
          >
            <AnalyticsBusinessPanel data={data.business} currency={currency} aiSummary={aiSummary} businessSlug={businessSlug} revenueForecast={revenueForecast} />
          </AnalyticsSection>
        </Suspense>
      ) : null}

      {/* Form performance — always last */}
      {data.pro ? <AnalyticsFormTable rows={data.pro.formPerformance} /> : null}
    </div>
  );
}
