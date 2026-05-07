import { PageHeader } from "@/components/shared/page-header";

import { BillingStatusCard } from "@/features/billing/components/billing-status-card";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import {
  getMonthlyInquiryCount,
  getMonthlyQuoteCount,
  getMonthlyRequoQuoteSendCount,
} from "@/lib/plans/usage";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BillingSettingsPage() {
  const { businessContext } = await getBusinessOwnerPageContext();
  const businessId = businessContext.business.id;

  const [
    billingOverview,
    inquiriesThisMonth,
    quotesThisMonth,
    requoQuoteEmailsThisMonth,
  ] =
    await Promise.all([
      getBusinessBillingOverview(businessId),
      getMonthlyInquiryCount(businessId),
      getMonthlyQuoteCount(businessId),
      getMonthlyRequoQuoteSendCount(businessId),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Plan & billing"
        description="Manage your subscription, payment method, and billing details."
      />

      <div className="mx-auto w-full max-w-5xl">
        {billingOverview ? (
        <BillingStatusCard
          billing={billingOverview}
          freePlanUsage={
            billingOverview.currentPlan === "free"
              ? {
                  inquiries: inquiriesThisMonth,
                  quotes: quotesThisMonth,
                  requoQuoteEmailsThisMonth,
                }
              : undefined
          }
        />
        ) : null}
      </div>
    </>
  );
}
