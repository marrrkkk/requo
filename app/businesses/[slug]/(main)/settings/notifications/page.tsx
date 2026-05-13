import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import {
  sendTestPushNotificationAction,
  updateBusinessNotificationSettingsAction,
} from "@/features/settings/actions";
import { BusinessNotificationSettingsForm } from "@/features/settings/components/business-notification-settings-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Notifications",
  description: "Configure push and email notifications for this business.",
});

export const unstable_instant = { prefetch: 'static' };

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
        businessId={settings.businessId}
        key={`business-notifications-${settings.updatedAt.getTime()}`}
        sendTestPushAction={sendTestPushNotificationAction}
        settings={settings}
      />
    </>
  );
}
