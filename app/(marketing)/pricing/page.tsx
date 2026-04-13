import type { Metadata } from "next";

import { PricingPage } from "@/components/marketing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — Requo",
  description:
    "Simple, transparent pricing for owner-led service businesses. Start free, upgrade when you need more.",
};

export default function PricingRoute() {
  return <PricingPage />;
}
