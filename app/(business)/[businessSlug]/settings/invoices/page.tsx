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

export default function BusinessInvoiceSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Invoices"
        description="Configure default payment terms for new invoices."
      />

      <Suspense fallback={<SettingsFormBodySkeleton />}>
        <InvoiceSettingsContent />
      </Suspense>
    </>
  );
}

async function InvoiceSettingsContent() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const businessId = businessContext.business.id;

  const settings = await getBusinessSettingsForBusiness(businessId);

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
