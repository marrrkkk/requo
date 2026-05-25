import { AnalyticsBusinessPanel } from "@/features/analytics/components/analytics-business-panel";
import { generateAnalyticsSummary } from "@/features/analytics/ai-summary";
import { getCohortAnalysis } from "@/features/analytics/cohort-analysis-query";
import { PremiumContentBlur } from "@/features/paywall";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { getBusinessAnalytics, getFreeAnalytics } from "@/features/analytics/queries";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan } from "@/lib/plans/plans";

type Props = {
  businessId: string;
  businessSlug: string;
  plan: BusinessPlan;
  currency: string;
};

export async function AnalyticsBusinessSection({ businessId, businessSlug, plan, currency }: Props) {
  if (!hasFeatureAccess(plan, "analyticsWorkflow")) {
    const billingOverview = await getBusinessBillingOverview(businessId);
    return (
      <PremiumContentBlur
        feature="analyticsWorkflow"
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

  const [data, freeData, cohorts] = await Promise.all([
    getBusinessAnalytics(businessId),
    getFreeAnalytics(businessId),
    getCohortAnalysis(businessId),
  ]);

  const aiSummary = await generateAnalyticsSummary(freeData, data);

  return <AnalyticsBusinessPanel data={data} currency={currency} aiSummary={aiSummary} businessSlug={businessSlug} cohorts={cohorts} />;
}
