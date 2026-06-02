import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { updateBusinessInvoiceSettingsAction } from "@/features/settings/actions";
import { BusinessInvoiceSettingsForm } from "@/features/settings/components/business-invoice-settings-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Invoices",
  description: "Business invoice defaults and payment terms.",
});

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BusinessInvoiceSettingsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const businessId = businessContext.business.id;

  const settingsPromise = getBusinessSettingsForBusiness(businessId);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Invoices"
        description="Configure default payment terms for new invoices."
      />

      <Suspense fallback={<SettingsFormBodySkeleton />}>
        <BusinessInvoiceSettingsBody settingsPromise={settingsPromise} />
      </Suspense>
    </>
  );
}

async function BusinessInvoiceSettingsBody({
  settingsPromise,
}: {
  settingsPromise: Promise<Awaited<ReturnType<typeof getBusinessSettingsForBusiness>>>;
}) {
  const settings = await settingsPromise;

  if (!settings) {
    return null;
  }

  return (
    <BusinessInvoiceSettingsForm
      action={updateBusinessInvoiceSettingsAction}
      settings={settings}
    />
  );
}
