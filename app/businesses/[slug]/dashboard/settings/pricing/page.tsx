import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import {
  createQuoteLibraryEntryAction,
  deleteQuoteLibraryEntryAction,
  updateQuoteLibraryEntryAction,
} from "@/features/quotes/quote-library-actions";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { BusinessPricingLibraryManager } from "@/features/settings/components/business-pricing-library-manager";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BusinessPricingPage() {
  const { businessContext } = await getBusinessOwnerPageContext();
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
        title="Pricing library"
        description="Reusable pricing blocks and service packages."
      />

      <BusinessPricingLibraryManager
        createAction={createQuoteLibraryEntryAction}
        currency={settings.defaultCurrency}
        deleteAction={deleteQuoteLibraryEntryAction}
        quoteLibrary={quoteLibrary}
        updateAction={updateQuoteLibraryEntryAction}
      />
    </>
  );
}
