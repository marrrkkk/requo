import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsBusinessPanel } from "@/features/analytics/components/analytics-business-panel";
import { AnalyticsFreePanel } from "@/features/analytics/components/analytics-free-panel";
import { AnalyticsProPanel } from "@/features/analytics/components/analytics-pro-panel";
import {
  getBusinessAnalytics,
  getFreeAnalytics,
  getProAnalytics,
} from "@/features/analytics/queries";
import { PremiumContentBlur } from "@/features/paywall";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan } from "@/lib/plans/plans";

type Props = {
  businessId: string;
  businessSlug: string;
  currency: string;
  plan: BusinessPlan;
};

async function ProSection({ businessId, plan, businessSlug }: { businessId: string; plan: BusinessPlan; businessSlug: string }) {
  if (!hasFeatureAccess(plan, "analyticsConversion")) {
    const billingOverview = await getBusinessBillingOverview(businessId);
    return (
      <PremiumContentBlur
        feature="analyticsConversion"
        plan={plan}
        placeholder={<ProPlaceholder />}
        upgradeAction={
          billingOverview
            ? {
                userId: billingOverview.userId,
                businessId: billingOverview.businessId,
                businessSlug: billingOverview.businessSlug,
                currentPlan: billingOverview.currentPlan,
              }
            : undefined
        }
      >
        <div />
      </PremiumContentBlur>
    );
  }

  const [free, pro] = await Promise.all([
    getFreeAnalytics(businessId),
    getProAnalytics(businessId),
  ]);

  return <AnalyticsProPanel free={free} pro={pro} />;
}

async function BusinessSection({ businessId, plan, businessSlug, currency }: { businessId: string; plan: BusinessPlan; businessSlug: string; currency: string }) {
  if (!hasFeatureAccess(plan, "analyticsWorkflow")) {
    const billingOverview = await getBusinessBillingOverview(businessId);
    return (
      <PremiumContentBlur
        feature="analyticsWorkflow"
        plan={plan}
        placeholder={<BusinessPlaceholder />}
        upgradeAction={
          billingOverview
            ? {
                userId: billingOverview.userId,
                businessId: billingOverview.businessId,
                businessSlug: billingOverview.businessSlug,
                currentPlan: billingOverview.currentPlan,
              }
            : undefined
        }
      >
        <div />
      </PremiumContentBlur>
    );
  }

  const data = await getBusinessAnalytics(businessId);

  return <AnalyticsBusinessPanel data={data} currency={currency} />;
}

function ProPlaceholder() {
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

function BusinessPlaceholder() {
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

export async function AnalyticsDashboard({
  businessId,
  businessSlug,
  currency,
  plan,
}: Props) {
  const freeData = await getFreeAnalytics(businessId);

  return (
    <div className="flex flex-col gap-10">
      {/* Always visible — basic metrics */}
      <section>
        <AnalyticsFreePanel data={freeData} />
      </section>

      {/* Pro tier — trends, funnel, form breakdown */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Performance
          </h2>
          <span className="meta-label">Pro</span>
        </div>
        <Suspense fallback={<ProPlaceholder />}>
          <ProSection businessId={businessId} plan={plan} businessSlug={businessSlug} />
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
        <Suspense fallback={<BusinessPlaceholder />}>
          <BusinessSection
            businessId={businessId}
            plan={plan}
            businessSlug={businessSlug}
            currency={currency}
          />
        </Suspense>
      </section>
    </div>
  );
}
