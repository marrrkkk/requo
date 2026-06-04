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

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

export default function BillingSettingsPage() {
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
            <BillingStatusSection />
          </Suspense>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold tracking-tight">
              Order history
            </h3>
            <Suspense fallback={<PaymentHistoryBodySkeleton />}>
              <PaymentHistorySection />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

async function BillingStatusSection() {
  const { user, businessContext } = await getBusinessOwnerPageContext();
  const businessId = businessContext.business.id;

  const [
    billingOverview,
    inquiriesThisMonth,
    quotesThisMonth,
    requoQuoteEmailsThisMonth,
    members,
    liveForms,
  ] = await Promise.all([
    getBusinessBillingOverview(businessId),
    getMonthlyInquiryCount(businessId),
    getMonthlyQuoteCount(businessId),
    getMonthlyRequoQuoteSendCount(businessId),
    getBusinessMemberCount(businessId),
    getBusinessLiveFormsCount(businessId),
  ]);

  if (!billingOverview) return null;

  const plan = billingOverview.currentPlan;
  const aiUsage = await getMonthlyUsageSummary(user.id, plan);

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

async function PaymentHistorySection() {
  const { businessContext } = await getBusinessOwnerPageContext();
  const businessId = businessContext.business.id;

  const paymentHistory = await getAccountPaymentHistory(businessId);

  return <PaymentHistoryTable records={paymentHistory} />;
}
