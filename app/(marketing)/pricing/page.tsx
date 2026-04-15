import type { Metadata } from "next";

import { PricingPage } from "@/components/marketing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — Requo",
  description:
    "Simple, transparent pricing for owner-led service businesses. Start free, upgrade when you need more.",
};

/**
 * The pricing page is statically prerendered for performance.
 * It defaults to USD pricing. Users see localized PHP pricing
 * when they open the checkout dialog inside the app, where
 * region detection via request headers is available.
 */
export default function PricingRoute() {
  return <PricingPage currency="USD" />;
}
