import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
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
import { getBusinessOperationalPageContext } from "../../settings/_lib/page-context";

export default async function BusinessFormPage({
  params,
}: {
  params: Promise<{ formSlug: string }>;
}) {
  const { businessContext } = await getBusinessOperationalPageContext();
  const { formSlug } = await params;
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

      <div className="mt-6 sm:mt-8">
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
      </div>
    </>
  );
}
