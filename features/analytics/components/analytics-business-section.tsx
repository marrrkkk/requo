import { AnalyticsBusinessPanel } from "@/features/analytics/components/analytics-business-panel";
import { PremiumContentBlur } from "@/features/paywall";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { getBusinessAnalytics } from "@/features/analytics/queries";
import { hasFeatureAccess } from "@/lib/plans";
import { Skeleton } from "@/components/ui/skeleton";
import type { BusinessPlan } from "@/lib/plans/plans";

type Props = {
  businessId: string;
  businessSlug: string;
  plan: BusinessPlan;
  currency: string;
};

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

export async function AnalyticsBusinessSection({ businessId, businessSlug, plan, currency }: Props) {
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
