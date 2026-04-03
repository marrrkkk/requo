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
import { getQuoteLibraryForWorkspace } from "@/features/quotes/quote-library-queries";
import { getWorkspaceSettingsForWorkspace } from "@/features/settings/queries";
import { getWorkspaceOwnerPageContext } from "../_lib/page-context";

export default async function WorkspacePricingLibraryPage() {
  const { workspaceContext } = await getWorkspaceOwnerPageContext();
  const [settings, quoteLibrary] = await Promise.all([
    getWorkspaceSettingsForWorkspace(workspaceContext.workspace.id),
    getQuoteLibraryForWorkspace(workspaceContext.workspace.id),
  ]);

  if (!settings) {
    notFound();
  }

  const pricingBlocks = quoteLibrary.filter((entry) => entry.kind === "block");
  const servicePackages = quoteLibrary.filter((entry) => entry.kind === "package");

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Pricing library"
        description="Save reusable pricing blocks and service packages, then insert them into draft quotes when needed."
        actions={
          <>
            <DashboardMetaPill>{quoteLibrary.length} saved entries</DashboardMetaPill>
            <DashboardMetaPill>{pricingBlocks.length} blocks</DashboardMetaPill>
            <DashboardMetaPill>{servicePackages.length} packages</DashboardMetaPill>
          </>
        }
      />

      <DashboardDetailLayout className="xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardSection
          description="Create reusable pricing blocks or service packages the owner can insert into draft quotes."
          title="Save a pricing entry"
        >
          <QuoteLibraryEntryForm
            action={createQuoteLibraryEntryAction}
            currency={settings.defaultCurrency}
            submitLabel="Save pricing entry"
            submitPendingLabel="Saving pricing entry..."
            idPrefix="quote-library-create"
          />
        </DashboardSection>

        <DashboardSidebarStack>
          <DashboardSection
            description="Single reusable items for common services or fees."
            title="Pricing blocks"
          >
            {pricingBlocks.length ? (
              <div className="flex flex-col gap-4">
                {pricingBlocks.map((entry) => (
                  <QuoteLibraryEntryCard
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
                description="Save single reusable line items such as callout fees, rush production, or standard service charges."
                icon={FileText}
                title="No pricing blocks yet"
                variant="section"
              />
            )}
          </DashboardSection>

          <DashboardSection
            description="Reusable multi-item packages for common scopes."
            title="Service packages"
          >
            {servicePackages.length ? (
              <div className="flex flex-col gap-4">
                {servicePackages.map((entry) => (
                  <QuoteLibraryEntryCard
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
                description="Save bundles of reusable line items for recurring jobs, installs, or production packages."
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
