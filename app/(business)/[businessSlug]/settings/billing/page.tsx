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
  getBusinessLiveFormsCount,
  getBusinessMemberCount,
  getMonthlyInquiryCount,
  getMonthlyQuoteCount,
  getMonthlyRequoQuoteSendCount,
} from "@/lib/plans/usage";
import { getMonthlyUsageSummary } from "@/lib/ai/usage-limiter";
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

  // Start all fetches up front. Two Suspense boundaries consume
  // them so each section can paint independently.
  const billingOverviewPromise = getBusinessBillingOverview(businessId);
  const inquiriesThisMonthPromise = getMonthlyInquiryCount(businessId);
  const quotesThisMonthPromise = getMonthlyQuoteCount(businessId);
  const requoQuoteEmailsThisMonthPromise =
    getMonthlyRequoQuoteSendCount(businessId);
  const membersPromise = getBusinessMemberCount(businessId);
  const liveFormsPromise = getBusinessLiveFormsCount(businessId);
  const paymentHistoryPromise = getAccountPaymentHistory(businessId);

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
              userId={user.id}
              billingOverviewPromise={billingOverviewPromise}
              inquiriesThisMonthPromise={inquiriesThisMonthPromise}
              quotesThisMonthPromise={quotesThisMonthPromise}
              requoQuoteEmailsThisMonthPromise={requoQuoteEmailsThisMonthPromise}
              membersPromise={membersPromise}
              liveFormsPromise={liveFormsPromise}
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
  userId,
  billingOverviewPromise,
  inquiriesThisMonthPromise,
  quotesThisMonthPromise,
  requoQuoteEmailsThisMonthPromise,
  membersPromise,
  liveFormsPromise,
}: {
  userId: string;
  billingOverviewPromise: ReturnType<typeof getBusinessBillingOverview>;
  inquiriesThisMonthPromise: ReturnType<typeof getMonthlyInquiryCount>;
  quotesThisMonthPromise: ReturnType<typeof getMonthlyQuoteCount>;
  requoQuoteEmailsThisMonthPromise: ReturnType<
    typeof getMonthlyRequoQuoteSendCount
  >;
  membersPromise: ReturnType<typeof getBusinessMemberCount>;
  liveFormsPromise: ReturnType<typeof getBusinessLiveFormsCount>;
}) {
  const [
    billingOverview,
    inquiriesThisMonth,
    quotesThisMonth,
    requoQuoteEmailsThisMonth,
    members,
    liveForms,
  ] = await Promise.all([
    billingOverviewPromise,
    inquiriesThisMonthPromise,
    quotesThisMonthPromise,
    requoQuoteEmailsThisMonthPromise,
    membersPromise,
    liveFormsPromise,
  ]);

  if (!billingOverview) return null;

  const plan = billingOverview.currentPlan;
  const aiUsage = await getMonthlyUsageSummary(userId, plan);

  return (
    <BillingStatusCard
      billing={billingOverview}
      freePlanUsage={
        plan === "free"
          ? {
              inquiries: inquiriesThisMonth,
              quotes: quotesThisMonth,
              requoQuoteEmailsThisMonth,
            }
          : undefined
      }
      planUsage={{
        quotes: quotesThisMonth,
        requoQuoteEmailsThisMonth,
        aiCredits: { used: aiUsage.used, limit: aiUsage.limit },
        members,
        liveForms,
      }}
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
