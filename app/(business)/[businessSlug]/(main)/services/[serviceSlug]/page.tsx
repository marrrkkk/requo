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
  getBusinessProductsPath,
  getBusinessServicePreviewPath,
  getBusinessServicesPath,
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
  title: "Service editor",
  description: "Manage a service's intake form, public page, and settings.",
});

export const instant = true;

type ServicePageProps = {
  params: Promise<{ businessSlug: string; serviceSlug: string }>;
};

/**
 * Service editor page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, session, getBusinessOperationalPageContext, service
 * editor queries) are pushed into a `<Suspense>`-wrapped child server component
 * so the shell paints instantly on client navigation.
 */
export default function BusinessServicePage({ params }: ServicePageProps) {
  return (
    <>
      <RegionErrorBoundary fallback={<ServiceEditorSkeleton />}>
        <Suspense fallback={<ServiceEditorSkeleton />}>
          <ServiceEditorContent params={params} />
        </Suspense>
      </RegionErrorBoundary>
    </>
  );
}

function ServiceEditorSkeleton() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Loading service..."
        description="Manage this service's intake form, public page, and settings."
      />
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 border-b border-border/80 pb-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-9 w-24 rounded-lg" key={index} />
          ))}
        </div>
  <div className="section-panel animate-pulse">
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

async function ServiceEditorContent({ params }: ServicePageProps) {
  const [session, { businessContext }, { serviceSlug }] = await Promise.all([
    requireSession(),
    getBusinessOperationalPageContext(),
    params,
  ]);
  const formSlug = serviceSlug;
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
  const previewHref = getBusinessServicePreviewPath(
    settings.slug,
    settings.formSlug,
  );
  const inquiryListHref = getBusinessServicesPath(settings.slug);
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
        eyebrow="Services"
        title={settings.formName}
        description="Manage this service's intake form, public page, and settings."
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
        productsHref={getBusinessProductsPath(settings.slug)}
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
