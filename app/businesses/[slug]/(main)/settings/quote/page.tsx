import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { updateBusinessQuoteSettingsAction } from "@/features/settings/actions";
import { BusinessQuoteSettingsForm } from "@/features/settings/components/business-quote-settings-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export default async function BusinessQuoteSettingsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const settings = await getBusinessSettingsForBusiness(
    businessContext.business.id,
  );

  if (!settings) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Quote defaults"
        description="Set the default note and validity window for new quotes."
      />

      <BusinessQuoteSettingsForm
        action={updateBusinessQuoteSettingsAction}
        key={`business-quote-settings-${settings.updatedAt.getTime()}`}
        settings={settings}
      />
    </>
  );
}
