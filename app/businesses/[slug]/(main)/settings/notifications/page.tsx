import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { SettingsNotificationsBodySkeleton } from "@/components/shell/settings-body-skeletons";
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

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BusinessNotificationSettingsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const settingsPromise = getBusinessSettingsForBusiness(
    businessContext.business.id,
  );

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Notifications"
        description="Choose how you get notified — in-app or push."
      />
      <Suspense fallback={<SettingsNotificationsBodySkeleton />}>
        <BusinessNotificationSettingsBody settingsPromise={settingsPromise} />
      </Suspense>
    </>
  );
}

async function BusinessNotificationSettingsBody({
  settingsPromise,
}: {
  settingsPromise: ReturnType<typeof getBusinessSettingsForBusiness>;
}) {
  const settings = await settingsPromise;

  if (!settings) {
    notFound();
  }

  return (
    <BusinessNotificationSettingsForm
      action={updateBusinessNotificationSettingsAction}
      businessId={settings.businessId}
      key={`business-notifications-${settings.updatedAt.getTime()}`}
      sendTestPushAction={sendTestPushNotificationAction}
      settings={settings}
    />
  );
}
