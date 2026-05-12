import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { ServerActionButton } from "@/components/shared/server-action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";
import {
  updateBusinessSettingsAction,
} from "@/features/settings/actions";
import {
  archiveBusinessAction,
  deleteBusinessPermanentlyAction,
  restoreBusinessAction,
  unarchiveBusinessAction,
} from "@/features/businesses/actions";
import { BusinessSettingsForm } from "@/features/settings/components/business-settings-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Profile",
  description: "General business profile settings, branding, and lifecycle actions.",
});

export default async function BusinessGeneralSettingsPage() {
  const { user, businessContext } = await getBusinessOwnerPageContext();
  const settings = await getBusinessSettingsForBusiness(
    businessContext.business.id,
  );

  if (!settings) {
    notFound();
  }

  if (settings.recordState === "archived") {
    const logoPreviewUrl = settings.logoStoragePath
      ? `/api/business/logo?v=${settings.updatedAt.getTime()}`
      : null;

    return (
      <>
        <PageHeader
          eyebrow="Business"
          title="Business profile"
          description="This business is archived and read-only."
        />

        <Card className="border-border/75 bg-card/97">
          <CardHeader className="gap-2.5 pb-5">
            <CardTitle>Restore business</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-0">
            <p className="text-sm text-muted-foreground">
              Restore this business to make it active again. You&apos;ll be able to
              manage inquiries, quotes, and settings.
            </p>
            <div data-allow-archived>
              <ServerActionButton
                action={unarchiveBusinessAction.bind(null, settings.id, settings.slug)}
                icon={RotateCcw}
                label="Restore business"
                pendingLabel="Restoring..."
              />
            </div>
          </CardContent>
        </Card>

        <BusinessSettingsForm
          action={updateBusinessSettingsAction}
          archiveAction={archiveBusinessAction.bind(null, settings.id, settings.slug)}
          deleteAction={deleteBusinessPermanentlyAction.bind(null, settings.id, settings.slug)}
          fallbackContactEmail={user.email}
          key={`business-settings-${settings.updatedAt.getTime()}`}
          logoPreviewUrl={logoPreviewUrl}
          restoreAction={restoreBusinessAction.bind(null, settings.id, settings.slug)}
          settings={settings}
          unarchiveAction={unarchiveBusinessAction.bind(null, settings.id, settings.slug)}
        />
      </>
    );
  }

  const logoPreviewUrl = settings.logoStoragePath
    ? `/api/business/logo?v=${settings.updatedAt.getTime()}`
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Business profile"
        description="Customer-facing details used on inquiry pages, quotes, and emails."
      />

      <BusinessSettingsForm
        action={updateBusinessSettingsAction}
        archiveAction={archiveBusinessAction.bind(null, settings.id, settings.slug)}
        deleteAction={deleteBusinessPermanentlyAction.bind(null, settings.id, settings.slug)}
        fallbackContactEmail={user.email}
        key={`business-settings-${settings.updatedAt.getTime()}`}
        logoPreviewUrl={logoPreviewUrl}
        restoreAction={restoreBusinessAction.bind(null, settings.id, settings.slug)}
        settings={settings}
        unarchiveAction={unarchiveBusinessAction.bind(null, settings.id, settings.slug)}
      />
    </>
  );
}
