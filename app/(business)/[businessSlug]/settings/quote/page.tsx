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
  description: "Business quote defaults.",
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
 * Quote settings page — non-blocking structural shell.
 *
 * Returns the page header synchronously. All dynamic reads
 * (getBusinessOperationalPageContext, settings queries)
 * are resolved inside a Suspense-wrapped child server component.
 *
 * Quote templates have moved to /settings/quote-templates.
 */
export default function BusinessQuoteSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Quotes"
        description="Configure default validity, notes, and terms for new quotes."
      />

      <Suspense fallback={<SettingsFormBodySkeleton />}>
        <BusinessQuoteSettingsContent />
      </Suspense>
    </>
  );
}

async function BusinessQuoteSettingsContent() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const businessId = businessContext.business.id;

  const settings = await getBusinessSettingsForBusiness(businessId);

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
