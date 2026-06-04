import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  applyBusinessInquiryFormPresetAction,
  archiveBusinessInquiryFormFromDetailAction,
  deleteBusinessInquiryFormAction,
  duplicateBusinessInquiryFormAction,
  setDefaultBusinessInquiryFormAction,
  toggleBusinessInquiryFormPublicAction,
  updateBusinessInquiryFormAction,
  updateBusinessInquiryPageAction,
} from "@/features/settings/actions";
import { BusinessInquiryFormEditorTabs } from "@/features/settings/components/business-inquiry-form-editor-tabs";
import { getBusinessInquiryFormEditorForBusiness } from "@/features/settings/queries";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import {
  getBusinessInquiryFormPreviewPath,
  getBusinessInquiryFormsPath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { canManageBusinessAdministration } from "@/lib/business-members";
import { getDefaultBusinessSettingsPath } from "@/features/settings/navigation";
import { FormEditorTour } from "@/features/onboarding/components/form-editor-tour";
import { getAccountProfileForUser } from "@/features/account/queries";
import { requireSession } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "@/app/(business)/[businessSlug]/settings/_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Form editor",
  description: "Edit fields, public page, preview, and publishing for an inquiry form.",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo", formSlug: "default" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

type FormPageProps = {
  params: Promise<{ formSlug: string }>;
};

/**
 * Form editor page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, session, getBusinessOperationalPageContext, form
 * editor queries) are pushed into a `<Suspense>`-wrapped child server component
 * so the shell paints instantly on client navigation.
 */
export default function BusinessFormPage({ params }: FormPageProps) {
  return (
    <>
      <RegionErrorBoundary fallback={<FormEditorSkeleton />}>
        <Suspense fallback={<FormEditorSkeleton />}>
          <FormEditorContent params={params} />
        </Suspense>
      </RegionErrorBoundary>
    </>
  );
}

function FormEditorSkeleton() {
  return (
    <>
      <PageHeader
        eyebrow="Forms"
        title="Loading form..."
        description="Edit the fields, public page, preview, and publishing controls for this inquiry workflow."
      />
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 border-b border-border/80 pb-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-9 w-24 rounded-lg" key={index} />
          ))}
        </div>
        <div className="section-panel animate-pulse p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-6 w-32 rounded-md" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-3">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
              <div className="grid gap-3">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

async function FormEditorContent({ params }: FormPageProps) {
  const [session, { businessContext }, { formSlug }] = await Promise.all([
    requireSession(),
    getBusinessOperationalPageContext(),
    params,
  ]);
  const settings = await getBusinessInquiryFormEditorForBusiness(
    businessContext.business.id,
    formSlug,
  );

  if (!settings) {
    notFound();
  }

  const logoPreviewUrl = settings.logoStoragePath
    ? `/api/business/logo?v=${settings.updatedAt.getTime()}`
    : null;
  const previewHref = getBusinessInquiryFormPreviewPath(
    settings.slug,
    settings.formSlug,
  );
  const inquiryListHref = getBusinessInquiryFormsPath(settings.slug);
  const generalSettingsHref = canManageBusinessAdministration(businessContext.role)
    ? getBusinessSettingsPath(settings.slug, "general")
    : null;
  const settingsHref = getDefaultBusinessSettingsPath(
    settings.slug,
    businessContext.role,
  );
  const publicInquiryHref = settings.isDefault
    ? getBusinessPublicInquiryUrl(settings.slug)
    : getBusinessPublicInquiryUrl(settings.slug, settings.formSlug);

  return (
    <>
      <PageHeader
        eyebrow="Forms"
        title={settings.formName}
        description="Edit the fields, public page, preview, and publishing controls for this inquiry workflow."
      />

      <BusinessInquiryFormEditorTabs
        key={`${settings.formId}-${settings.updatedAt.getTime()}`}
        settings={settings}
        logoPreviewUrl={logoPreviewUrl}
        generalSettingsHref={generalSettingsHref}
        settingsHref={settingsHref}
        previewHref={previewHref}
        publicInquiryHref={publicInquiryHref}
        inquiryListHref={inquiryListHref}
        isPublicLive={settings.publicInquiryEnabled}
        applyPresetAction={applyBusinessInquiryFormPresetAction.bind(
          null,
          settings.formSlug,
        )}
        saveFormAction={updateBusinessInquiryFormAction.bind(null, settings.formSlug)}
        updatePageAction={updateBusinessInquiryPageAction.bind(null, settings.formSlug)}
        duplicateAction={duplicateBusinessInquiryFormAction}
        setDefaultAction={setDefaultBusinessInquiryFormAction}
        togglePublicAction={toggleBusinessInquiryFormPublicAction}
        archiveAction={archiveBusinessInquiryFormFromDetailAction}
        deleteAction={deleteBusinessInquiryFormAction}
      />
      <Suspense fallback={null}>
        <FormEditorTourSection userId={session.user.id} />
      </Suspense>
    </>
  );
}

async function FormEditorTourSection({ userId }: { userId: string }) {
  const profile = await getAccountProfileForUser(userId);
  const showTour = Boolean(profile && !profile.formEditorTourCompletedAt);

  return <FormEditorTour show={showTour} />;
}
