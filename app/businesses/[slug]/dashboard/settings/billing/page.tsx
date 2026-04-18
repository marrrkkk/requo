import { PageHeader } from "@/components/shared/page-header";

import { BillingStatusCard } from "@/features/billing/components/billing-status-card";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import {
  getMonthlyInquiryCount,
  getMonthlyQuoteCount,
} from "@/lib/plans/usage";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BillingSettingsPage() {
  const { businessContext } = await getBusinessOwnerPageContext();
  const workspaceId = businessContext.business.workspaceId;

  const [billingOverview, inquiriesThisMonth, quotesThisMonth] =
    await Promise.all([
      getWorkspaceBillingOverview(workspaceId),
      getMonthlyInquiryCount(workspaceId),
      getMonthlyQuoteCount(workspaceId),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Plan & billing"
        description="Manage your workspace subscription, payment method, and billing details."
      />

      {billingOverview ? (
        <BillingStatusCard
          billing={billingOverview}
          monthlyUsage={
            billingOverview.currentPlan === "free"
              ? {
                  inquiries: inquiriesThisMonth,
                  quotes: quotesThisMonth,
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}
