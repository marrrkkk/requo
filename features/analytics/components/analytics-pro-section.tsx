import { AnalyticsProPanel } from "@/features/analytics/components/analytics-pro-panel";
import { PremiumContentBlur } from "@/features/paywall";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { getFreeAnalytics, getProAnalytics } from "@/features/analytics/queries";
import { hasFeatureAccess } from "@/lib/plans";
import { Skeleton } from "@/components/ui/skeleton";
import type { BusinessPlan } from "@/lib/plans/plans";

type Props = {
  businessId: string;
  businessSlug: string;
  plan: BusinessPlan;
};

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

export async function AnalyticsProSection({ businessId, businessSlug, plan }: Props) {
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
