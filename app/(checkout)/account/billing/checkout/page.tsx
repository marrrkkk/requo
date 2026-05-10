import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { InlinePaddleCheckoutPage } from "@/features/billing/components/inline-paddle-checkout-page";
import { getAccountBillingOverview } from "@/features/billing/queries";
import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForUser } from "@/lib/db/business-access";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";

export const metadata: Metadata = {
  title: "Checkout",
};

type AccountBillingCheckoutPageProps = {
  searchParams: Promise<{
    interval?: string;
    plan?: string;
  }>;
};

function normalizePlan(value: string | undefined): PaidPlan {
  return value === "business" ? "business" : "pro";
}

function normalizeInterval(value: string | undefined): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export default async function AccountBillingCheckoutPage({
  searchParams,
}: AccountBillingCheckoutPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Loading checkout…
            </p>
          </div>
        </div>
      }
    >
      <AccountBillingCheckoutContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountBillingCheckoutContent({
  searchParams,
}: AccountBillingCheckoutPageProps) {
  const session = await requireSession();
  const context = await getBusinessContextForUser(session.user.id);

  if (!context) {
    redirect(businessesHubPath);
  }

  const billing = await getAccountBillingOverview(context.business.id);
  if (!billing) {
    redirect("/account/billing");
  }

  const params = await searchParams;
  const initialPlan = normalizePlan(params.plan);
  const initialInterval = normalizeInterval(params.interval);

  return (
    <InlinePaddleCheckoutPage
      businessId={billing.businessId}
      businessName={billing.businessName}
      currentPlan={billing.currentPlan}
      defaultCurrency={billing.defaultCurrency}
      initialPlan={initialPlan}
      initialInterval={initialInterval}
      region={billing.region}
    />
  );
}
