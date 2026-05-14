import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import {
  BillingStatusCardBodySkeleton,
  PaymentHistoryBodySkeleton,
} from "@/components/shell/settings-body-skeletons";
import { BillingStatusCard } from "@/features/billing/components/billing-status-card";
import { PaymentHistoryTable } from "@/features/billing/components/payment-history-table";
import {
  getAccountBillingOverview,
  getAccountPaymentHistory,
} from "@/features/billing/queries";
import { listRefundsForPaymentAttempts, refundWindowDays } from "@/lib/billing/refunds";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForUser } from "@/lib/db/business-access";
import {
  getMonthlyInquiryCount,
  getMonthlyQuoteCount,
  getMonthlyRequoQuoteSendCount,
} from "@/lib/plans/usage";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Billing · Requo account",
  description:
    "Manage your Requo subscription, review usage, and view payment history.",
});

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function AccountBillingPage() {
  await connection();

  const session = await requireSession();
  const context = await getBusinessContextForUser(session.user.id);

  if (!context) {
    return (
      <div className="rounded-lg border border-border/75 p-6 text-center text-muted-foreground">
        Create a business first to manage billing.
      </div>
    );
  }

  const businessId = context.business.id;

  // Start every query up front so sections can stream in parallel.
  const billingOverviewPromise = getAccountBillingOverview(businessId);
  const inquiriesThisMonthPromise = getMonthlyInquiryCount(businessId);
  const quotesThisMonthPromise = getMonthlyQuoteCount(businessId);
  const requoQuoteEmailsThisMonthPromise =
    getMonthlyRequoQuoteSendCount(businessId);
  const paymentHistoryPromise = getAccountPaymentHistory(session.user.id);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-col gap-10">
        <Suspense fallback={<BillingStatusCardBodySkeleton />}>
          <AccountBillingStatusSection
            billingOverviewPromise={billingOverviewPromise}
            inquiriesThisMonthPromise={inquiriesThisMonthPromise}
            quotesThisMonthPromise={quotesThisMonthPromise}
            requoQuoteEmailsThisMonthPromise={requoQuoteEmailsThisMonthPromise}
          />
        </Suspense>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold tracking-tight">Order history</h3>
          <Suspense fallback={<PaymentHistoryBodySkeleton />}>
            <AccountPaymentHistorySection
              paymentHistoryPromise={paymentHistoryPromise}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function AccountBillingStatusSection({
  billingOverviewPromise,
  inquiriesThisMonthPromise,
  quotesThisMonthPromise,
  requoQuoteEmailsThisMonthPromise,
}: {
  billingOverviewPromise: ReturnType<typeof getAccountBillingOverview>;
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

  if (!billingOverview) {
    return (
      <div className="rounded-lg border border-border/75 p-6 text-center text-muted-foreground">
        Billing information is currently unavailable.
      </div>
    );
  }

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
      variant="full"
    />
  );
}

async function AccountPaymentHistorySection({
  paymentHistoryPromise,
}: {
  paymentHistoryPromise: ReturnType<typeof getAccountPaymentHistory>;
}) {
  const paymentHistory = await paymentHistoryPromise;
  // Refunds depend on payment history ids — chained on purpose.
  const refunds = await listRefundsForPaymentAttempts(
    paymentHistory.map((record) => record.id),
  );

  return (
    <PaymentHistoryTable
      records={paymentHistory}
      refunds={refunds.map((refund) => ({
        id: refund.id,
        paymentAttemptId: refund.paymentAttemptId,
        status: refund.status,
      }))}
      refundWindowDays={refundWindowDays}
    />
  );
}
