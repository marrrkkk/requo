import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { InlinePaddleCheckoutPage } from "@/features/billing/components/inline-paddle-checkout-page";
import { getAccountBillingOverview } from "@/features/billing/queries";
import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForUser } from "@/lib/db/business-access";
import { timed } from "@/lib/dev/server-timing";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Checkout · Requo",
  description: "Complete your Requo subscription checkout securely.",
});

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
  // Resolve session + searchParams in parallel (independent).
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const context = await timed(
    "checkout.getBusinessContextForUser",
    getBusinessContextForUser(session.user.id),
  );

  if (!context) {
    redirect(businessesHubPath);
  }

  const billing = await timed(
    "checkout.getAccountBillingOverview",
    getAccountBillingOverview(context.business.id),
  );
  if (!billing) {
    redirect("/account/billing");
  }

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
