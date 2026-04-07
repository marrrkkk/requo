import Link from "next/link";
import { ArrowUpRight, Eye, FormInput, LayoutTemplate } from "lucide-react";
import { notFound } from "next/navigation";

import {
  DashboardDetailLayout,
  DashboardMetaPill,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  applyBusinessInquiryFormPresetAction,
  archiveBusinessInquiryFormFromDetailAction,
  deleteBusinessInquiryFormAction,
  duplicateBusinessInquiryFormAction,
  setDefaultBusinessInquiryFormAction,
  updateBusinessInquiryFormAction,
  updateBusinessInquiryPageAction,
} from "@/features/settings/actions";
import { BusinessInquiryFormDangerZone } from "@/features/settings/components/business-inquiry-form-danger-zone";
import { BusinessInquiryFormForm } from "@/features/settings/components/business-inquiry-form-form";
import { BusinessInquiryFormManageCard } from "@/features/settings/components/business-inquiry-form-manage-card";
import { BusinessInquiryPageForm } from "@/features/settings/components/business-inquiry-page-form";
import { getBusinessInquiryFormEditorForBusiness } from "@/features/settings/queries";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import {
  getBusinessInquiryFormPreviewPath,
  getBusinessInquiryFormsPath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { inquiryPageTemplateMeta } from "@/features/inquiries/page-config";
import { businessTypeMeta } from "@/features/inquiries/business-types";
import { getBusinessOwnerPageContext } from "../../settings/_lib/page-context";

export default async function BusinessFormPage({
  params,
}: {
  params: Promise<{ formSlug: string }>;
}) {
  const { businessContext } = await getBusinessOwnerPageContext();
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
  const generalSettingsHref = getBusinessSettingsPath(settings.slug, "general");
  const publicInquiryHref = settings.isDefault
    ? getBusinessPublicInquiryUrl(settings.slug)
    : getBusinessPublicInquiryUrl(settings.slug, settings.formSlug);

  return (
    <>
      <PageHeader
        eyebrow="Forms"
        title={settings.formName}
        description="Edit the form, public page, and actions for this inquiry flow."
        actions={
          <>
            <DashboardMetaPill>
              <FormInput className="size-3.5" />
              {businessTypeMeta[settings.businessType].label}
            </DashboardMetaPill>
            <DashboardMetaPill>
              <LayoutTemplate className="size-3.5" />
              {inquiryPageTemplateMeta[settings.inquiryPageConfig.template].label}
            </DashboardMetaPill>
            <Link href={previewHref} prefetch={true}>
              <DashboardMetaPill className="inline-flex items-center gap-2">
                <Eye className="size-3.5" />
                Preview
              </DashboardMetaPill>
            </Link>
            {settings.publicInquiryEnabled ? (
              <Link
                href={publicInquiryHref}
                prefetch={false}
                rel="noreferrer"
                target="_blank"
              >
                <DashboardMetaPill className="inline-flex items-center gap-2">
                  <ArrowUpRight className="size-3.5" />
                  Live
                </DashboardMetaPill>
              </Link>
            ) : null}
          </>
        }
      />

      <DashboardDetailLayout className="items-start xl:grid-cols-[minmax(0,1.06fr)_21rem]">
        <DashboardSidebarStack>
          <BusinessInquiryFormForm
            key={`${settings.updatedAt.getTime()}-${settings.formId}-form`}
            applyPresetAction={applyBusinessInquiryFormPresetAction.bind(
              null,
              settings.formSlug,
            )}
            saveAction={updateBusinessInquiryFormAction.bind(null, settings.formSlug)}
            settings={settings}
          />

          <BusinessInquiryPageForm
            action={updateBusinessInquiryPageAction.bind(null, settings.formSlug)}
            settings={settings}
            logoPreviewUrl={logoPreviewUrl}
            generalSettingsHref={generalSettingsHref}
          />
        </DashboardSidebarStack>

        <DashboardSidebarStack className="xl:sticky xl:top-[5.5rem]">
          <BusinessInquiryFormManageCard
            duplicateAction={duplicateBusinessInquiryFormAction}
            formId={settings.formId}
            isDefault={settings.isDefault}
            setDefaultAction={setDefaultBusinessInquiryFormAction}
          />

          <BusinessInquiryFormDangerZone
            activeFormCount={settings.activeFormCount}
            archiveAction={archiveBusinessInquiryFormFromDetailAction}
            deleteAction={deleteBusinessInquiryFormAction}
            formId={settings.formId}
            inquiryListHref={inquiryListHref}
            isDefault={settings.isDefault}
            submittedInquiryCount={settings.submittedInquiryCount}
          />
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </>
  );
}
