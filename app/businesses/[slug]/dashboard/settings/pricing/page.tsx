import { FileText } from "lucide-react";
import { notFound } from "next/navigation";

import {
  DashboardDetailLayout,
  DashboardEmptyState,
  DashboardMetaPill,
  DashboardSection,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  createQuoteLibraryEntryAction,
  deleteQuoteLibraryEntryAction,
  updateQuoteLibraryEntryAction,
} from "@/features/quotes/quote-library-actions";
import { QuoteLibraryEntryCard } from "@/features/quotes/components/quote-library-entry-card";
import { QuoteLibraryEntryForm } from "@/features/quotes/components/quote-library-entry-form";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
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

  const pricingBlocks = quoteLibrary.filter((entry) => entry.kind === "block");
  const servicePackages = quoteLibrary.filter((entry) => entry.kind === "package");

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Pricing library"
        description="Save reusable pricing blocks and service packages."
        actions={
          <>
            <DashboardMetaPill>{quoteLibrary.length} saved entries</DashboardMetaPill>
            <DashboardMetaPill>{pricingBlocks.length} blocks</DashboardMetaPill>
            <DashboardMetaPill>{servicePackages.length} packages</DashboardMetaPill>
          </>
        }
      />

      <DashboardDetailLayout className="xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardSection title="Save a pricing entry">
          <QuoteLibraryEntryForm
            action={createQuoteLibraryEntryAction}
            currency={settings.defaultCurrency}
            submitLabel="Save pricing entry"
            submitPendingLabel="Saving pricing entry..."
            idPrefix="quote-library-create"
          />
        </DashboardSection>

        <DashboardSidebarStack>
          <DashboardSection title="Pricing blocks">
            {pricingBlocks.length ? (
              <div className="flex flex-col gap-4">
                {pricingBlocks.map((entry, index) => (
                  <QuoteLibraryEntryCard
                    animationDelayMs={Math.min(index * 45, 180)}
                    key={entry.id}
                    action={updateQuoteLibraryEntryAction.bind(null, entry.id)}
                    currency={settings.defaultCurrency}
                    deleteAction={deleteQuoteLibraryEntryAction.bind(null, entry.id)}
                    entry={entry}
                  />
                ))}
              </div>
            ) : (
              <DashboardEmptyState
                action={
                  <Button asChild variant="outline">
                    <a href="#quote-library-create-kind">Save a pricing block</a>
                  </Button>
                }
                description="No saved blocks."
                icon={FileText}
                title="No pricing blocks yet"
                variant="section"
              />
            )}
          </DashboardSection>

          <DashboardSection title="Service packages">
            {servicePackages.length ? (
              <div className="flex flex-col gap-4">
                {servicePackages.map((entry, index) => (
                  <QuoteLibraryEntryCard
                    animationDelayMs={Math.min(index * 45, 180)}
                    key={entry.id}
                    action={updateQuoteLibraryEntryAction.bind(null, entry.id)}
                    currency={settings.defaultCurrency}
                    deleteAction={deleteQuoteLibraryEntryAction.bind(null, entry.id)}
                    entry={entry}
                  />
                ))}
              </div>
            ) : (
              <DashboardEmptyState
                action={
                  <Button asChild variant="outline">
                    <a href="#quote-library-create-kind">Save a service package</a>
                  </Button>
                }
                description="No saved packages."
                icon={FileText}
                title="No service packages yet"
                variant="section"
              />
            )}
          </DashboardSection>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </>
  );
}
