import { analyticsSections, type AnalyticsSectionId } from "@/features/analytics/config";
import { AnalyticsConversionTab } from "@/features/analytics/components/analytics-conversion-tab";
import { AnalyticsOverviewTab } from "@/features/analytics/components/analytics-overview-tab";
import { AnalyticsTabsShell } from "@/features/analytics/components/analytics-tabs-shell";
import { AnalyticsWorkflowTab } from "@/features/analytics/components/analytics-workflow-tab";
import {
  getBusinessAnalyticsData,
  getConversionAnalyticsData,
  getWorkflowAnalyticsData,
} from "@/features/analytics/queries";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import {
  PremiumContentBlur,
  placeholderConversionData,
  placeholderWorkflowData,
} from "@/features/paywall";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

import { AnalyticsConversionPlaceholder } from "./analytics-conversion-placeholder";
import { AnalyticsWorkflowPlaceholder } from "./analytics-workflow-placeholder";
import { getBusinessAnalyticsPath } from "@/features/businesses/routes";

type AnalyticsTabPanelProps = {
  activeTab: AnalyticsSectionId;
  businessId: string;
  businessSlug: string;
  currency: string;
  plan: plan;
};

export async function AnalyticsTabPanel({
  activeTab,
  businessId,
  businessSlug,
  currency,
  plan,
}: AnalyticsTabPanelProps) {
  const pathname = getBusinessAnalyticsPath(businessSlug);
  let content: React.ReactNode;

  if (activeTab === analyticsSections.overview.id) {
    const overviewData = await getBusinessAnalyticsData(businessId);

    content = <AnalyticsOverviewTab data={overviewData} />;
  } else if (activeTab === analyticsSections.conversion.id) {
    if (hasFeatureAccess(plan, "analyticsConversion")) {
      const conversionData = await getConversionAnalyticsData(businessId);

      content = <AnalyticsConversionTab currency={currency} data={conversionData} />;
    } else {
      const billingOverview = await getBusinessBillingOverview(businessId);

      content = (
        <PremiumContentBlur
          feature="analyticsConversion"
          plan={plan}
          placeholder={
            <AnalyticsConversionPlaceholder
              data={placeholderConversionData}
              currency={currency}
            />
          }
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
          {/* Premium content not rendered when locked */}
          <AnalyticsConversionTab currency={currency} data={null as never} />
        </PremiumContentBlur>
      );
    }
  } else if (hasFeatureAccess(plan, "analyticsWorkflow")) {
    const workflowData = await getWorkflowAnalyticsData(businessId);

    content = <AnalyticsWorkflowTab data={workflowData} />;
  } else {
    const billingOverview = await getBusinessBillingOverview(businessId);

    content = (
      <PremiumContentBlur
        feature="analyticsWorkflow"
        plan={plan}
        placeholder={
          <AnalyticsWorkflowPlaceholder data={placeholderWorkflowData} />
        }
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
        {/* Premium content not rendered when locked */}
        <AnalyticsWorkflowTab data={null as never} />
      </PremiumContentBlur>
    );
  }

  return (
    <AnalyticsTabsShell activeTab={activeTab} pathname={pathname}>
      {content}
    </AnalyticsTabsShell>
  );
}
