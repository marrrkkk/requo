import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import { PricingPage } from "@/components/marketing/pricing-page";
import { getBillingRegion, getDefaultCurrency } from "@/lib/billing/region";

export const metadata: Metadata = {
  title: "Pricing — Requo",
  description:
    "Simple, transparent pricing for owner-led service businesses. Start free, upgrade when you need more.",
};

async function PricingRouteDynamic() {
  const requestHeaders = await headers();
  const region = getBillingRegion(requestHeaders);
  const currency = getDefaultCurrency(region);

  return <PricingPage currency={currency} />;
}

/**
 * Dynamic pricing page — detects the visitor's region from request
 * headers and shows localized pricing (PHP for Philippines, USD
 * everywhere else). Wrapped in Suspense to allow PPR of the page shell.
 */
export default function PricingRoute() {
  return (
    <Suspense fallback={<PricingPage currency="USD" />}>
      <PricingRouteDynamic />
    </Suspense>
  );
}
