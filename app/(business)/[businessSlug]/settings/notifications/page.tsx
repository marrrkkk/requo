import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BusinessNotificationSettingsStaticFallback } from "@/components/shell/settings-body-skeletons";
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

export const instant = true;

/**
 * Notifications settings page — non-blocking structural shell.
 *
 * Static section titles, descriptions, and toggle labels paint instantly
 * (like (main) PageHeader titles); only the Switch controls that need DB
 * values stream behind skeletons. All dynamic reads are resolved inside a
 * Suspense-wrapped child server component.
 */
export default function BusinessNotificationSettingsPage() {
  return (
    <Suspense fallback={<BusinessNotificationSettingsStaticFallback />}>
      <BusinessNotificationSettingsContent />
    </Suspense>
  );
}

async function BusinessNotificationSettingsContent() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const settings = await getBusinessSettingsForBusiness(
    businessContext.business.id,
  );

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
