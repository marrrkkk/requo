import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import {
  deleteBusinessAction,
  updateBusinessSettingsAction,
} from "@/features/settings/actions";
import { BusinessSettingsForm } from "@/features/settings/components/business-settings-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BusinessGeneralSettingsPage() {
  const { user, businessContext } = await getBusinessOwnerPageContext();
  const settings = await getBusinessSettingsForBusiness(
    businessContext.business.id,
  );

  if (!settings) {
    notFound();
  }

  const logoPreviewUrl = settings.logoStoragePath
    ? `/api/business/logo?v=${settings.updatedAt.getTime()}`
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="General"
        description="Brand, contact, writing defaults, and notifications."
      />

      <BusinessSettingsForm
        action={updateBusinessSettingsAction}
        deleteAction={deleteBusinessAction}
        fallbackContactEmail={user.email}
        logoPreviewUrl={logoPreviewUrl}
        settings={settings}
      />
    </>
  );
}
