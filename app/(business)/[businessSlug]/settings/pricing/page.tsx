import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import { SettingsPricingBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import {
  analyzeImportAction,
  commitKnowledgeImportAction,
  commitPricingImportAction,
} from "@/features/importer/actions";
import {
  createQuoteLibraryEntryAction,
  deleteQuoteLibraryEntryAction,
  updateQuoteLibraryEntryAction,
} from "@/features/quotes/quote-library-actions";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import { BusinessPricingLibraryManager } from "@/features/settings/components/business-pricing-library-manager";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { hasFeatureAccess } from "@/lib/plans";
import { getUsageLimit } from "@/lib/plans/usage-limits";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Pricing",
  description: "Manage the pricing library used to build quotes quickly.",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

export default function BusinessPricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Pricing"
        description="Reusable pricing blocks and packages for faster quotes."
      />
      <Suspense fallback={<SettingsPricingBodySkeleton />}>
        <PricingContent />
      </Suspense>
    </>
  );
}

async function PricingContent() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const hasAccess = hasFeatureAccess(
    businessContext.business.plan,
    "quoteLibrary",
  );

  if (!hasAccess) {
    const billingOverview = await getBusinessBillingOverview(
      businessContext.business.id,
    );

    return (
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
                ctaLabel: "Upgrade for pricing library",
              }
            : undefined
        }
      />
    );
  }

  const [settings, quoteLibrary] = await Promise.all([
    getBusinessSettingsForBusiness(businessContext.business.id),
    getQuoteLibraryForBusiness(businessContext.business.id),
  ]);

  if (!settings) {
    notFound();
  }

  // Filter out templates — they have their own dedicated page
  const pricingEntries = quoteLibrary.filter(
    (entry) => entry.kind !== "template",
  );

  return (
    <BusinessPricingLibraryManager
      createAction={createQuoteLibraryEntryAction}
      deleteAction={deleteQuoteLibraryEntryAction}
      pricingLimit={getUsageLimit(businessContext.business.plan, "pricingEntriesPerBusiness")}
      quoteLibrary={pricingEntries}
      updateAction={updateQuoteLibraryEntryAction}
      importerEnabled={hasFeatureAccess(businessContext.business.plan, "aiAssistant")}
      analyzeImportAction={analyzeImportAction}
      commitKnowledgeImportAction={commitKnowledgeImportAction}
      commitPricingImportAction={commitPricingImportAction}
    />
  );
}
