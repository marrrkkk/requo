import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { updateBusinessQuoteSettingsAction } from "@/features/settings/actions";
import { BusinessQuoteSettingsForm } from "@/features/settings/components/business-quote-settings-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Quotes",
  description: "Business quote defaults and templates.",
});

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BusinessQuoteSettingsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const settingsPromise = getBusinessSettingsForBusiness(
    businessContext.business.id,
  );

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Quote defaults"
        description="Set the default note and validity window for new quotes."
      />
      <Suspense fallback={<SettingsFormBodySkeleton />}>
        <BusinessQuoteSettingsBody settingsPromise={settingsPromise} />
      </Suspense>
    </>
  );
}

async function BusinessQuoteSettingsBody({
  settingsPromise,
}: {
  settingsPromise: ReturnType<typeof getBusinessSettingsForBusiness>;
}) {
  const settings = await settingsPromise;

  if (!settings) {
    notFound();
  }

  return (
    <BusinessQuoteSettingsForm
      action={updateBusinessQuoteSettingsAction}
      key={`business-quote-settings-${settings.updatedAt.getTime()}`}
      settings={settings}
    />
  );
}
