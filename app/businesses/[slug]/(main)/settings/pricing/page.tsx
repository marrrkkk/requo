import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import {
  createQuoteLibraryEntryAction,
  deleteQuoteLibraryEntryAction,
  updateQuoteLibraryEntryAction,
} from "@/features/quotes/quote-library-actions";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { BusinessPricingLibraryManager } from "@/features/settings/components/business-pricing-library-manager";
import { hasFeatureAccess } from "@/lib/plans";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export default async function BusinessPricingPage() {
  const { businessContext } = await getBusinessOperationalPageContext();

  if (!hasFeatureAccess(businessContext.business.workspacePlan, "quoteLibrary")) {
    const billingOverview = await getWorkspaceBillingOverview(
      businessContext.business.workspaceId,
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
          plan={businessContext.business.workspacePlan}
          description="Upgrade to build reusable pricing blocks and speed up quote creation."
          upgradeAction={
            billingOverview
              ? {
                  workspaceId: billingOverview.workspaceId,
                  workspaceSlug: billingOverview.workspaceSlug,
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

  const [settings, quoteLibrary] = await Promise.all([
    getBusinessSettingsForBusiness(businessContext.business.id),
    getQuoteLibraryForBusiness(businessContext.business.id),
  ]);

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
