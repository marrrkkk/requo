import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import { SettingsCollectionBodySkeleton } from "@/components/shell/settings-body-skeletons";
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

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BusinessPricingPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const hasAccess = hasFeatureAccess(
    businessContext.business.plan,
    "quoteLibrary",
  );

  const billingPromise = hasAccess
    ? null
    : getBusinessBillingOverview(businessContext.business.id);

  const settingsPromise = hasAccess
    ? getBusinessSettingsForBusiness(businessContext.business.id)
    : null;
  const quoteLibraryPromise = hasAccess
    ? getQuoteLibraryForBusiness(businessContext.business.id)
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Pricing"
        description="Reusable pricing blocks and packages for faster quotes."
      />

      {hasAccess && settingsPromise && quoteLibraryPromise ? (
        <Suspense fallback={<SettingsCollectionBodySkeleton />}>
          <BusinessPricingBody
            businessPlan={businessContext.business.plan}
            settingsPromise={settingsPromise}
            quoteLibraryPromise={quoteLibraryPromise}
          />
        </Suspense>
      ) : billingPromise ? (
        <Suspense fallback={<SettingsCollectionBodySkeleton />}>
          <LockedPricingBody
            plan={businessContext.business.plan}
            billingPromise={billingPromise}
          />
        </Suspense>
      ) : null}
    </>
  );
}

async function BusinessPricingBody({
  businessPlan,
  settingsPromise,
  quoteLibraryPromise,
}: {
  businessPlan: Awaited<ReturnType<typeof getBusinessOperationalPageContext>>["businessContext"]["business"]["plan"];
  settingsPromise: ReturnType<typeof getBusinessSettingsForBusiness>;
  quoteLibraryPromise: ReturnType<typeof getQuoteLibraryForBusiness>;
}) {
  const [settings, quoteLibrary] = await Promise.all([
    settingsPromise,
    quoteLibraryPromise,
  ]);

  if (!settings) {
    notFound();
  }

  return (
    <BusinessPricingLibraryManager
      createAction={createQuoteLibraryEntryAction}
      deleteAction={deleteQuoteLibraryEntryAction}
      pricingLimit={getUsageLimit(businessPlan, "pricingEntriesPerBusiness")}
      quoteLibrary={quoteLibrary}
      updateAction={updateQuoteLibraryEntryAction}
      importerEnabled={hasFeatureAccess(businessPlan, "aiAssistant")}
      analyzeImportAction={analyzeImportAction}
      commitKnowledgeImportAction={commitKnowledgeImportAction}
      commitPricingImportAction={commitPricingImportAction}
    />
  );
}

async function LockedPricingBody({
  plan,
  billingPromise,
}: {
  plan: Awaited<ReturnType<typeof getBusinessOperationalPageContext>>["businessContext"]["business"]["plan"];
  billingPromise: ReturnType<typeof getBusinessBillingOverview>;
}) {
  const billingOverview = await billingPromise;

  return (
    <LockedFeaturePage
      feature="quoteLibrary"
      plan={plan}
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
