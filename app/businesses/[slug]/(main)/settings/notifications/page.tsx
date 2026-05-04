import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { updateBusinessNotificationSettingsAction } from "@/features/settings/actions";
import { BusinessNotificationSettingsForm } from "@/features/settings/components/business-notification-settings-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export default async function BusinessNotificationSettingsPage() {
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
        eyebrow="Business"
        title="Notifications"
        description="Choose how you get notified — in-app or push."
      />

      <BusinessNotificationSettingsForm
        action={updateBusinessNotificationSettingsAction}
        key={`business-notifications-${settings.updatedAt.getTime()}`}
        settings={settings}
      />
    </>
  );
}
