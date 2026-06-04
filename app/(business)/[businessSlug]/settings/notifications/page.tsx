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
 * Notifications settings page — non-blocking structural shell.
 *
 * Returns the page header synchronously. All dynamic reads
 * (getBusinessOperationalPageContext, settings queries) are resolved
 * inside a Suspense-wrapped child server component.
 */
export default function BusinessNotificationSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Notifications"
        description="Choose how you get notified — in-app or push."
      />
      <Suspense fallback={<SettingsNotificationsBodySkeleton />}>
        <BusinessNotificationSettingsContent />
      </Suspense>
    </>
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
