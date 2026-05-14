import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ServerActionButton } from "@/components/shared/server-action-button";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  archiveBusinessAction,
  deleteBusinessPermanentlyAction,
  restoreBusinessAction,
  unarchiveBusinessAction,
} from "@/features/businesses/actions";
import { BusinessSettingsForm } from "@/features/settings/components/business-settings-form";
import { updateBusinessSettingsAction } from "@/features/settings/actions";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Profile",
  description:
    "General business profile settings, branding, and lifecycle actions.",
});

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BusinessGeneralSettingsPage() {
  // Auth gate runs synchronously with the page frame; the slow settings
  // query streams in below via <Suspense>.
  const { user, businessContext } = await getBusinessOwnerPageContext();
  const settingsPromise = getBusinessSettingsForBusiness(
    businessContext.business.id,
  );

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Business profile"
        description="Customer-facing details used on inquiry pages, quotes, and emails."
      />
      <Suspense fallback={<SettingsFormBodySkeleton />}>
        <BusinessGeneralSettingsBody
          settingsPromise={settingsPromise}
          userEmail={user.email}
        />
      </Suspense>
    </>
  );
}

async function BusinessGeneralSettingsBody({
  settingsPromise,
  userEmail,
}: {
  settingsPromise: ReturnType<typeof getBusinessSettingsForBusiness>;
  userEmail: string;
}) {
  const settings = await settingsPromise;

  if (!settings) {
    notFound();
  }

  const logoPreviewUrl = settings.logoStoragePath
    ? `/api/business/logo?v=${settings.updatedAt.getTime()}`
    : null;

  if (settings.recordState === "archived") {
    return (
      <>
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
                action={unarchiveBusinessAction.bind(
                  null,
                  settings.id,
                  settings.slug,
                )}
                icon={RotateCcw}
                label="Restore business"
                pendingLabel="Restoring..."
              />
            </div>
          </CardContent>
        </Card>

        <BusinessSettingsForm
          action={updateBusinessSettingsAction}
          archiveAction={archiveBusinessAction.bind(
            null,
            settings.id,
            settings.slug,
          )}
          deleteAction={deleteBusinessPermanentlyAction.bind(
            null,
            settings.id,
            settings.slug,
          )}
          fallbackContactEmail={userEmail}
          key={`business-settings-${settings.updatedAt.getTime()}`}
          logoPreviewUrl={logoPreviewUrl}
          restoreAction={restoreBusinessAction.bind(
            null,
            settings.id,
            settings.slug,
          )}
          settings={settings}
          unarchiveAction={unarchiveBusinessAction.bind(
            null,
            settings.id,
            settings.slug,
          )}
        />
      </>
    );
  }

  return (
    <BusinessSettingsForm
      action={updateBusinessSettingsAction}
      archiveAction={archiveBusinessAction.bind(null, settings.id, settings.slug)}
      deleteAction={deleteBusinessPermanentlyAction.bind(
        null,
        settings.id,
        settings.slug,
      )}
      fallbackContactEmail={userEmail}
      key={`business-settings-${settings.updatedAt.getTime()}`}
      logoPreviewUrl={logoPreviewUrl}
      restoreAction={restoreBusinessAction.bind(
        null,
        settings.id,
        settings.slug,
      )}
      settings={settings}
      unarchiveAction={unarchiveBusinessAction.bind(
        null,
        settings.id,
        settings.slug,
      )}
    />
  );
}
