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
import { mapRefundsByPaymentAttempt, refundWindowDays } from "@/lib/billing/refunds";
import { getBillingProvider } from "@/lib/billing/providers";
import type { DodoProvider } from "@/lib/billing/providers/dodo";
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

  // Enrich the payment method label from Dodo if the subscription has a
  // provider subscription ID. The stored `paymentMethod` field is often
  // null because the webhook doesn't carry card details.
  if (
    billingOverview.subscription &&
    !billingOverview.subscription.paymentMethod &&
    billingOverview.subscription.providerSubscriptionId
  ) {
    const provider = getBillingProvider("dodo") as DodoProvider;
    const subDetails = await provider.getSubscriptionDetails(
      billingOverview.subscription.providerSubscriptionId,
    ).catch(() => null);

    if (subDetails?.paymentMethod) {
      billingOverview.subscription.paymentMethod = subDetails.paymentMethod;
    } else {
      // Fall back to the most recent succeeded payment's method
      const { getAccountPaymentHistory } = await import(
        "@/features/billing/queries"
      );
      const recentPayments = await getAccountPaymentHistory(
        billingOverview.userId,
        1,
      );
      if (recentPayments.length > 0) {
        const details = await provider.getPaymentDetails(
          recentPayments[0].providerPaymentId,
        );
        if (details) {
          if (details.cardBrand && details.cardLast4) {
            billingOverview.subscription.paymentMethod = `${details.cardBrand} •••• ${details.cardLast4}`;
          } else if (details.paymentMethodType) {
            const type = details.paymentMethodType;
            switch (type) {
              case "google_pay":
                billingOverview.subscription.paymentMethod = "Google Pay";
                break;
              case "apple_pay":
                billingOverview.subscription.paymentMethod = "Apple Pay";
                break;
              case "paypal":
                billingOverview.subscription.paymentMethod = "PayPal";
                break;
              default:
                billingOverview.subscription.paymentMethod = type
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
            }
          }
        }
      }
    }
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

  // Fetch payment method details from Dodo for each payment in parallel.
  const provider = getBillingProvider("dodo") as DodoProvider;
  const detailsMap = new Map<
    string,
    { paymentMethod: string | null; paymentMethodType: string | null; cardBrand: string | null; cardLast4: string | null }
  >();

  const uniquePaymentIds = [
    ...new Set(paymentHistory.map((r) => r.providerPaymentId).filter(Boolean)),
  ];

  const detailResults = await Promise.allSettled(
    uniquePaymentIds.map(async (id) => {
      const details = await provider.getPaymentDetails(id);
      if (details) detailsMap.set(id, details);
    }),
  );
  void detailResults;

  function formatPaymentMethodLabel(providerPaymentId: string): string {
    const details = detailsMap.get(providerPaymentId);
    if (!details) return "Card";

    const brand = details.cardBrand;
    const last4 = details.cardLast4;

    // Card with brand + last 4 (e.g. "Visa •••• 4242")
    if (brand && last4) {
      return `${brand.charAt(0).toUpperCase()}${brand.slice(1).toLowerCase()} •••• ${last4}`;
    }

    // Wallet (e.g. "Google Pay", "Apple Pay")
    if (details.paymentMethodType) {
      const type = details.paymentMethodType;
      switch (type) {
        case "google_pay": return "Google Pay";
        case "apple_pay": return "Apple Pay";
        case "paypal": return "PayPal";
        case "gcash": return "GCash";
        case "maya": return "Maya";
        default:
          return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // Generic method (e.g. "card", "bank_transfer", "wallet")
    if (details.paymentMethod) {
      const method = details.paymentMethod;
      switch (method) {
        case "card": return "Card";
        case "wallet": return "Digital wallet";
        case "bank_transfer": return "Bank transfer";
        default:
          return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    return "Card";
  }

  // Refunds depend on payment history ids — chained on purpose.
  const refundsByPaymentAttempt = await mapRefundsByPaymentAttempt(
    paymentHistory.map((record) => ({
      id: record.id,
      providerPaymentId: record.providerPaymentId,
    })),
  );
  const refunds = Array.from(refundsByPaymentAttempt.values());

  return (
    <PaymentHistoryTable
      records={paymentHistory.map((record) => ({
        ...record,
        paymentMethodLabel: formatPaymentMethodLabel(record.providerPaymentId),
      }))}
      refunds={refunds.map((refund) => ({
        id: refund.id,
        providerPaymentId: refund.providerPaymentId,
        status: refund.status,
      }))}
      refundWindowDays={refundWindowDays}
    />
  );
}
