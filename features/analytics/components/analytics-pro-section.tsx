import { AnalyticsProPanel } from "@/features/analytics/components/analytics-pro-panel";
import { PremiumContentBlur } from "@/features/paywall";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { getFreeAnalytics, getProAnalytics } from "@/features/analytics/queries";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan } from "@/lib/plans/plans";

type Props = {
  businessId: string;
  businessSlug: string;
  plan: BusinessPlan;
};

export async function AnalyticsProSection({ businessId, businessSlug, plan }: Props) {
  if (!hasFeatureAccess(plan, "analyticsConversion")) {
    const billingOverview = await getBusinessBillingOverview(businessId);
    return (
      <PremiumContentBlur
        feature="analyticsConversion"
        plan={plan}
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
