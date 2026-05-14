import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import {
  BillingStatusCardBodySkeleton,
  PaymentHistoryBodySkeleton,
} from "@/components/shell/settings-body-skeletons";
import { BillingStatusCard } from "@/features/billing/components/billing-status-card";
import { PaymentHistoryTable } from "@/features/billing/components/payment-history-table";
import {
  getAccountPaymentHistory,
  getBusinessBillingOverview,
} from "@/features/billing/queries";
import {
  getMonthlyInquiryCount,
  getMonthlyQuoteCount,
  getMonthlyRequoQuoteSendCount,
} from "@/lib/plans/usage";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Billing",
  description: "Business billing overview, usage, and payment history.",
});

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BillingSettingsPage() {
  const { user, businessContext } = await getBusinessOwnerPageContext();
  const businessId = businessContext.business.id;

  // Start all four fetches up front. Two Suspense boundaries consume
  // them so each section can paint independently.
  const billingOverviewPromise = getBusinessBillingOverview(businessId);
  const inquiriesThisMonthPromise = getMonthlyInquiryCount(businessId);
  const quotesThisMonthPromise = getMonthlyQuoteCount(businessId);
  const requoQuoteEmailsThisMonthPromise =
    getMonthlyRequoQuoteSendCount(businessId);
  const paymentHistoryPromise = getAccountPaymentHistory(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Plan & billing"
        description="Manage your subscription, payment method, and billing details."
      />

      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-10">
          <Suspense fallback={<BillingStatusCardBodySkeleton />}>
            <BillingStatusSection
              billingOverviewPromise={billingOverviewPromise}
              inquiriesThisMonthPromise={inquiriesThisMonthPromise}
              quotesThisMonthPromise={quotesThisMonthPromise}
              requoQuoteEmailsThisMonthPromise={requoQuoteEmailsThisMonthPromise}
            />
          </Suspense>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold tracking-tight">
              Order history
            </h3>
            <Suspense fallback={<PaymentHistoryBodySkeleton />}>
              <PaymentHistorySection
                paymentHistoryPromise={paymentHistoryPromise}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

async function BillingStatusSection({
  billingOverviewPromise,
  inquiriesThisMonthPromise,
  quotesThisMonthPromise,
  requoQuoteEmailsThisMonthPromise,
}: {
  billingOverviewPromise: ReturnType<typeof getBusinessBillingOverview>;
  inquiriesThisMonthPromise: ReturnType<typeof getMonthlyInquiryCount>;
  quotesThisMonthPromise: ReturnType<typeof getMonthlyQuoteCount>;
  requoQuoteEmailsThisMonthPromise: ReturnType<
    typeof getMonthlyRequoQuoteSendCount
  >;
}) {
  const [
    billingOverview,
    inquiriesThisMonth,
    quotesThisMonth,
    requoQuoteEmailsThisMonth,
  ] = await Promise.all([
    billingOverviewPromise,
    inquiriesThisMonthPromise,
    quotesThisMonthPromise,
    requoQuoteEmailsThisMonthPromise,
  ]);

  if (!billingOverview) return null;

  return (
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
  );
}

async function PaymentHistorySection({
  paymentHistoryPromise,
}: {
  paymentHistoryPromise: ReturnType<typeof getAccountPaymentHistory>;
}) {
  const paymentHistory = await paymentHistoryPromise;

  return <PaymentHistoryTable records={paymentHistory} />;
}
