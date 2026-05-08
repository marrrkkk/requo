import { PageHeader } from "@/components/shared/page-header";

import { BillingStatusCard } from "@/features/billing/components/billing-status-card";
import { PaymentHistoryTable } from "@/features/billing/components/payment-history-table";
import { getBusinessBillingOverview, getAccountPaymentHistory } from "@/features/billing/queries";
import {
  getMonthlyInquiryCount,
  getMonthlyQuoteCount,
  getMonthlyRequoQuoteSendCount,
} from "@/lib/plans/usage";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BillingSettingsPage() {
  const { user, businessContext } = await getBusinessOwnerPageContext();
  const businessId = businessContext.business.id;

  const [
    billingOverview,
    inquiriesThisMonth,
    quotesThisMonth,
    requoQuoteEmailsThisMonth,
    paymentHistory,
  ] =
    await Promise.all([
      getBusinessBillingOverview(businessId),
      getMonthlyInquiryCount(businessId),
      getMonthlyQuoteCount(businessId),
      getMonthlyRequoQuoteSendCount(businessId),
      getAccountPaymentHistory(user.id),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Plan & billing"
        description="Manage your subscription, payment method, and billing details."
      />

      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-10">
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

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold tracking-tight">Order history</h3>
            <PaymentHistoryTable records={paymentHistory} />
          </div>
        </div>
      </div>
    </>
  );
}
