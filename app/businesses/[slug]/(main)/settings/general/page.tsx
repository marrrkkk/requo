import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { PlanBadge } from "@/components/shared/paywall";
import {
  updateBusinessSettingsAction,
} from "@/features/settings/actions";
import {
  archiveBusinessAction,
  restoreBusinessAction,
  trashBusinessAction,
  unarchiveBusinessAction,
} from "@/features/businesses/actions";
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
        title="Business profile"
        description="Business details, branding, and regional defaults."
        actions={<PlanBadge plan={businessContext.business.workspacePlan} />}
      />

      <BusinessSettingsForm
        action={updateBusinessSettingsAction}
        archiveAction={archiveBusinessAction.bind(null, settings.id, settings.slug)}
        fallbackContactEmail={user.email}
        key={`business-settings-${settings.updatedAt.getTime()}`}
        logoPreviewUrl={logoPreviewUrl}
        restoreAction={restoreBusinessAction.bind(null, settings.id, settings.slug)}
        settings={settings}
        trashAction={trashBusinessAction.bind(null, settings.id, settings.slug)}
        unarchiveAction={unarchiveBusinessAction.bind(null, settings.id, settings.slug)}
      />
    </>
  );
}
