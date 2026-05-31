import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import {
  SettingsCollectionBodySkeleton,
  SettingsFormBodySkeleton,
} from "@/components/shell/settings-body-skeletons";
import { isAutoCreateJobOnAcceptanceEnabled } from "@/features/automations/queries";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import {
  createQuoteLibraryEntryAction,
  deleteQuoteLibraryEntryAction,
  updateQuoteLibraryEntryAction,
} from "@/features/quotes/quote-library-actions";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import type { QuoteLibraryBlockReference } from "@/features/quotes/components/quote-library-entry-form";
import { updateBusinessQuoteSettingsAction } from "@/features/settings/actions";
import { BusinessQuoteSettingsForm } from "@/features/settings/components/business-quote-settings-form";
import { QuoteTemplatesManager } from "@/features/settings/components/quote-templates-manager";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { hasFeatureAccess } from "@/lib/plans";
import { getUsageLimit } from "@/lib/plans/usage-limits";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Quotes",
  description: "Business quote defaults and templates.",
});

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BusinessQuoteSettingsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const businessId = businessContext.business.id;
  const businessPlan = businessContext.business.plan;

  const settingsPromise = getBusinessSettingsForBusiness(businessId);
  const autoJobPromise = isAutoCreateJobOnAcceptanceEnabled(businessId);

  const hasLibraryAccess = hasFeatureAccess(businessPlan, "quoteLibrary");
  const quoteLibraryPromise = hasLibraryAccess
    ? getQuoteLibraryForBusiness(businessId)
    : null;
  const billingPromise =
    !hasLibraryAccess ? getBusinessBillingOverview(businessId) : null;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Quotes"
        description="Configure quote defaults and manage reusable templates."
      />

      {/* Defaults section */}
      <Suspense fallback={<SettingsFormBodySkeleton />}>
        <BusinessQuoteSettingsBody
          settingsPromise={settingsPromise}
          autoJobPromise={autoJobPromise}
        />
      </Suspense>

      {/* Templates section */}
      {hasLibraryAccess && quoteLibraryPromise ? (
        <Suspense fallback={<SettingsCollectionBodySkeleton />}>
          <QuoteTemplatesBody
            businessPlan={businessPlan}
            quoteLibraryPromise={quoteLibraryPromise}
            settingsPromise={settingsPromise}
          />
        </Suspense>
      ) : billingPromise ? (
        <Suspense fallback={<SettingsCollectionBodySkeleton />}>
          <LockedTemplatesBody
            plan={businessPlan}
            billingPromise={billingPromise}
          />
        </Suspense>
      ) : null}
    </>
  );
}

async function BusinessQuoteSettingsBody({
  settingsPromise,
  autoJobPromise,
}: {
  settingsPromise: ReturnType<typeof getBusinessSettingsForBusiness>;
  autoJobPromise: ReturnType<typeof isAutoCreateJobOnAcceptanceEnabled>;
}) {
  const [settings, autoJob] = await Promise.all([settingsPromise, autoJobPromise]);

  if (!settings) {
    notFound();
  }

  return (
    <BusinessQuoteSettingsForm
      action={updateBusinessQuoteSettingsAction}
      autoCreateJobOnAcceptance={autoJob.enabled}
      key={`business-quote-settings-${settings.updatedAt.getTime()}`}
      settings={settings}
    />
  );
}

async function QuoteTemplatesBody({
  businessPlan,
  quoteLibraryPromise,
  settingsPromise,
}: {
  businessPlan: Awaited<
    ReturnType<typeof getBusinessOperationalPageContext>
  >["businessContext"]["business"]["plan"];
  quoteLibraryPromise: ReturnType<typeof getQuoteLibraryForBusiness>;
  settingsPromise: ReturnType<typeof getBusinessSettingsForBusiness>;
}) {
  const [quoteLibrary, settings] = await Promise.all([
    quoteLibraryPromise,
    settingsPromise,
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
      businessDefaults={settings ? {
        defaultQuoteNotes: settings.defaultQuoteNotes,
        defaultQuoteTerms: settings.defaultQuoteTerms,
        defaultQuoteValidityDays: settings.defaultQuoteValidityDays,
      } : undefined}
      createAction={createQuoteLibraryEntryAction}
      deleteAction={deleteQuoteLibraryEntryAction}
      pricingLimit={getUsageLimit(businessPlan, "pricingEntriesPerBusiness")}
      templates={templates}
      totalLibraryCount={quoteLibrary.length}
      updateAction={updateQuoteLibraryEntryAction}
    />
  );
}

async function LockedTemplatesBody({
  plan,
  billingPromise,
}: {
  plan: Awaited<
    ReturnType<typeof getBusinessOperationalPageContext>
  >["businessContext"]["business"]["plan"];
  billingPromise: ReturnType<typeof getBusinessBillingOverview>;
}) {
  const billingOverview = await billingPromise;

  return (
    <LockedFeaturePage
      feature="quoteLibrary"
      plan={plan}
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
