import { Suspense } from "react";
import { connection } from "next/server";

import { BillingStatusCard } from "@/features/billing/components/billing-status-card";
import { PaymentHistoryTable } from "@/features/billing/components/payment-history-table";
import { getAccountBillingOverview, getAccountPaymentHistory } from "@/features/billing/queries";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForUser } from "@/lib/db/business-access";
import {
  getMonthlyInquiryCount,
  getMonthlyQuoteCount,
  getMonthlyRequoQuoteSendCount,
} from "@/lib/plans/usage";
import AccountBillingLoading from "./loading";

export const unstable_instant = false;

export default function AccountBillingPage() {
  return (
    <Suspense fallback={<AccountBillingLoading />}>
      <AccountBillingContent />
    </Suspense>
  );
}

async function AccountBillingContent() {
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

  const [
    billingOverview,
    inquiriesThisMonth,
    quotesThisMonth,
    requoQuoteEmailsThisMonth,
    paymentHistory,
  ] =
    await Promise.all([
      getAccountBillingOverview(businessId),
      getMonthlyInquiryCount(businessId),
      getMonthlyQuoteCount(businessId),
      getMonthlyRequoQuoteSendCount(businessId),
      getAccountPaymentHistory(session.user.id),
    ]);

  if (!billingOverview) {
    return (
      <div className="rounded-lg border border-border/75 p-6 text-center text-muted-foreground">
        Billing information is currently unavailable.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-col gap-10">
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

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold tracking-tight">Order history</h3>
          <PaymentHistoryTable records={paymentHistory} />
        </div>
      </div>
    </div>
  );
}
