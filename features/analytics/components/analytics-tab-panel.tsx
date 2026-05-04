import { LockedFeatureCard } from "@/components/shared/paywall";
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
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import { hasFeatureAccess } from "@/lib/plans";
import type { WorkspacePlan } from "@/lib/plans/plans";

import { getBusinessAnalyticsPath } from "@/features/businesses/routes";

type AnalyticsTabPanelProps = {
  activeTab: AnalyticsSectionId;
  businessId: string;
  businessSlug: string;
  currency: string;
  plan: WorkspacePlan;
  workspaceId: string;
};

export async function AnalyticsTabPanel({
  activeTab,
  businessId,
  businessSlug,
  currency,
  plan,
  workspaceId,
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
      const billingOverview = await getWorkspaceBillingOverview(workspaceId);

      content = (
        <LockedFeatureCard
          description="Upgrade to compare form traffic, inquiry conversion, and quote handoff performance."
          feature="analyticsConversion"
          plan={plan}
          title="Inquiry/Form Performance"
          upgradeAction={
            billingOverview
              ? {
                  workspaceId: billingOverview.workspaceId,
                  workspaceSlug: billingOverview.workspaceSlug,
                  currentPlan: billingOverview.currentPlan,
                  region: billingOverview.region,
                  defaultCurrency: billingOverview.defaultCurrency,
                  ctaLabel: "Upgrade for conversion analytics",
                }
              : undefined
          }
        />
      );
    }
  } else if (hasFeatureAccess(plan, "analyticsWorkflow")) {
    const workflowData = await getWorkflowAnalyticsData(businessId);

    content = <AnalyticsWorkflowTab data={workflowData} />;
  } else {
    const billingOverview = await getWorkspaceBillingOverview(workspaceId);

    content = (
      <LockedFeatureCard
        description="Upgrade to monitor quote outcomes, response speed, and turnaround timing."
        feature="analyticsWorkflow"
        plan={plan}
        title="Quote Performance"
        upgradeAction={
          billingOverview
            ? {
                workspaceId: billingOverview.workspaceId,
                workspaceSlug: billingOverview.workspaceSlug,
                currentPlan: billingOverview.currentPlan,
                region: billingOverview.region,
                defaultCurrency: billingOverview.defaultCurrency,
                ctaLabel: "Upgrade for quote performance",
              }
            : undefined
        }
      />
    );
  }

  return (
    <AnalyticsTabsShell activeTab={activeTab} pathname={pathname}>
      {content}
    </AnalyticsTabsShell>
  );
}
