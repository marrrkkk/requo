import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import {
  createQuoteLibraryEntryAction,
  deleteQuoteLibraryEntryAction,
  updateQuoteLibraryEntryAction,
} from "@/features/quotes/quote-library-actions";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { BusinessPricingLibraryManager } from "@/features/settings/components/business-pricing-library-manager";
import { hasFeatureAccess } from "@/lib/plans";
import { timed } from "@/lib/dev/server-timing";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Pricing",
  description: "Manage the pricing library used to build quotes quickly.",
});

export default async function BusinessPricingPage() {
  const { businessContext } = await getBusinessOperationalPageContext();

  if (!hasFeatureAccess(businessContext.business.plan, "quoteLibrary")) {
    const billingOverview = await getBusinessBillingOverview(
      businessContext.business.id,
    );

    return (
      <>
        <PageHeader
          eyebrow="Quotes"
          title="Pricing"
          description="Reusable pricing blocks and packages for faster quotes."
        />
        <LockedFeaturePage
          feature="quoteLibrary"
          plan={businessContext.business.plan}
          description="Upgrade to build reusable pricing blocks and speed up quote creation."
          upgradeAction={
            billingOverview
              ? {
                  userId: billingOverview.userId,
                  businessId: billingOverview.businessId,
                  businessSlug: billingOverview.businessSlug,
                  currentPlan: billingOverview.currentPlan,
                  region: billingOverview.region,
                  defaultCurrency: billingOverview.defaultCurrency,
                  ctaLabel: "Upgrade for pricing library",
                }
              : undefined
          }
        />
      </>
    );
  }

  const [settings, quoteLibrary] = await timed(
    "pricingSettings.parallelSettingsAndLibrary",
    Promise.all([
      getBusinessSettingsForBusiness(businessContext.business.id),
      getQuoteLibraryForBusiness(businessContext.business.id),
    ]),
  );

  if (!settings) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Pricing"
        description="Reusable pricing blocks and packages for faster quotes."
      />

      <BusinessPricingLibraryManager
        createAction={createQuoteLibraryEntryAction}
        deleteAction={deleteQuoteLibraryEntryAction}
        quoteLibrary={quoteLibrary}
        updateAction={updateQuoteLibraryEntryAction}
      />
    </>
  );
}
