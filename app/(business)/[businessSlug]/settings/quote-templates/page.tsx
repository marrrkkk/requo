import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import { SettingsCollectionBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import {
  createQuoteLibraryEntryAction,
  deleteQuoteLibraryEntryAction,
  updateQuoteLibraryEntryAction,
} from "@/features/quotes/quote-library-actions";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import type { QuoteLibraryBlockReference } from "@/features/quotes/components/quote-library-entry-form";
import { QuoteTemplatesManager } from "@/features/settings/components/quote-templates-manager";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { hasFeatureAccess } from "@/lib/plans";
import { getUsageLimit } from "@/lib/plans/usage-limits";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Templates",
  description: "Manage reusable quote templates for this business.",
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

/**
 * Quote templates settings page — non-blocking structural shell.
 *
 * Returns the page header synchronously. All dynamic reads
 * (getBusinessOperationalPageContext, library/billing queries)
 * are resolved inside a Suspense-wrapped child server component.
 */
export default function BusinessQuoteTemplatesSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Templates"
        description="Create and manage reusable quote templates to speed up quoting."
      />
      <Suspense fallback={<SettingsCollectionBodySkeleton />}>
        <QuoteTemplatesContent />
      </Suspense>
    </>
  );
}

async function QuoteTemplatesContent() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const businessId = businessContext.business.id;
  const businessPlan = businessContext.business.plan;

  const hasLibraryAccess = hasFeatureAccess(businessPlan, "quoteLibrary");

  if (hasLibraryAccess) {
    const [quoteLibrary, settings] = await Promise.all([
      getQuoteLibraryForBusiness(businessId),
      getBusinessSettingsForBusiness(businessId),
    ]);
    const templates = quoteLibrary.filter((entry) => entry.kind === "template");
    const availableBlocks: QuoteLibraryBlockReference[] = quoteLibrary
      .filter((entry) => entry.kind !== "template")
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        currency: entry.currency,
        totalInCents: entry.totalInCents,
        items: entry.items,
      }));

    return (
      <QuoteTemplatesManager
        availableBlocks={availableBlocks}
        businessDefaults={
          settings
            ? {
                defaultQuoteNotes: settings.defaultQuoteNotes,
                defaultQuoteTerms: settings.defaultQuoteTerms,
                defaultQuoteValidityDays: settings.defaultQuoteValidityDays,
              }
            : undefined
        }
        createAction={createQuoteLibraryEntryAction}
        deleteAction={deleteQuoteLibraryEntryAction}
        pricingLimit={getUsageLimit(businessPlan, "productEntriesPerBusiness")}
        templates={templates}
        totalLibraryCount={quoteLibrary.length}
        updateAction={updateQuoteLibraryEntryAction}
      />
    );
  }

  const billingOverview = await getBusinessBillingOverview(businessId).catch(
    () => null,
  );

  return (
    <LockedFeaturePage
      feature="quoteLibrary"
      plan={businessPlan}
      description="Upgrade to create reusable quote templates and speed up quoting."
      upgradeAction={
        billingOverview
          ? {
              userId: billingOverview.userId,
              businessId: billingOverview.businessId,
              businessSlug: billingOverview.businessSlug,
              currentPlan: billingOverview.currentPlan,
              ctaLabel: "Upgrade for quote templates",
            }
          : undefined
      }
    />
  );
}
