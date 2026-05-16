import type { Metadata } from "next";
import { Suspense } from "react";

import { PricingPage } from "@/components/marketing/pricing-page";
import { StructuredData } from "@/components/seo/structured-data";
import { planPricing } from "@/lib/billing/plans";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";
import { businessPlans, planMeta, type BusinessPlan } from "@/lib/plans/plans";
import { absoluteUrl, createPageMetadata } from "@/lib/seo/site";
import {
  buildBreadcrumbsForPathname,
  getBreadcrumbListStructuredData,
  getProductPricingStructuredData,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  description:
    "Transparent Requo pricing for owner-led service businesses. Start free, upgrade when you grow, and manage inquiries, quotes, and follow-up in one hub.",
  pathname: "/pricing",
  title: "Pricing",
});

const PRICING_CURRENCY = "USD";

const INTERVAL_TO_INCREMENT: Record<BillingInterval, "month" | "year"> = {
  monthly: "month",
  yearly: "year",
};

const INTERVAL_SUFFIX: Record<BillingInterval, string> = {
  monthly: "monthly",
  yearly: "yearly",
};

/**
 * Builds schema.org Offer entries for every plan × interval pair from the
 * canonical plan catalog. Free plans get `price: 0`; paid plans convert the
 * cents amount in `planPricing` to a decimal currency value.
 */
function buildPricingOffers() {
  const intervals: ReadonlyArray<BillingInterval> = ["monthly", "yearly"];

  return businessPlans.flatMap((plan) =>
    intervals.map((interval) => {
      const price =
        plan === "free"
          ? 0
          : planPricing[interval][plan as PaidPlan][PRICING_CURRENCY] / 100;

      return {
        billingIncrement: INTERVAL_TO_INCREMENT[interval],
        name: `${planMeta[plan as BusinessPlan].label} (${INTERVAL_SUFFIX[interval]})`,
        price,
        priceCurrency: PRICING_CURRENCY,
      };
    }),
  );
}

/**
 * Pricing is always shown in USD. Polar handles regional pricing per
 * product configuration at checkout, so Requo no longer detects a region.
 */
export default function PricingRoute() {
  const productStructuredData = getProductPricingStructuredData({
    description: "Quote software for owner-led service businesses.",
    name: "Requo",
    offers: buildPricingOffers(),
    url: absoluteUrl("/pricing"),
  });

  const breadcrumbItems = buildBreadcrumbsForPathname("/pricing", {
    "/pricing": "Pricing",
  });
  const breadcrumbStructuredData = breadcrumbItems.length
    ? getBreadcrumbListStructuredData({
        items: breadcrumbItems.map((item) => ({
          ...item,
          url: absoluteUrl(item.url),
        })),
      })
    : null;

  return (
    <>
      <StructuredData
        data={productStructuredData}
        id="requo-product-pricing-structured-data"
      />
      {breadcrumbStructuredData ? (
        <StructuredData
          data={breadcrumbStructuredData}
          id="breadcrumb-structured-data"
        />
      ) : null}
      <Suspense fallback={<PricingPage currency="USD" />}>
        <PricingPage currency="USD" />
      </Suspense>
    </>
  );
}
