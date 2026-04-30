import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { updateBusinessEmailTemplateSettingsAction } from "@/features/settings/actions";
import { BusinessEmailTemplateForm } from "@/features/settings/components/business-email-template-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export default async function BusinessEmailTemplateSettingsPage() {
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
        title="Email templates"
        description="Customize the automated email sent with your quotes."
      />

      <BusinessEmailTemplateForm
        action={updateBusinessEmailTemplateSettingsAction}
        key={`business-email-template-settings-${settings.updatedAt.getTime()}`}
        settings={settings}
      />
    </>
  );
}
