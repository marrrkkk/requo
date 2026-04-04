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
  applyWorkspaceInquiryFormPresetAction,
  archiveWorkspaceInquiryFormFromDetailAction,
  deleteWorkspaceInquiryFormAction,
  duplicateWorkspaceInquiryFormAction,
  setDefaultWorkspaceInquiryFormAction,
  updateWorkspaceInquiryFormAction,
  updateWorkspaceInquiryPageAction,
} from "@/features/settings/actions";
import { WorkspaceInquiryFormDangerZone } from "@/features/settings/components/workspace-inquiry-form-danger-zone";
import { WorkspaceInquiryFormForm } from "@/features/settings/components/workspace-inquiry-form-form";
import { WorkspaceInquiryFormManageCard } from "@/features/settings/components/workspace-inquiry-form-manage-card";
import { WorkspaceInquiryPageForm } from "@/features/settings/components/workspace-inquiry-page-form";
import { getWorkspaceInquiryFormEditorForWorkspace } from "@/features/settings/queries";
import { getWorkspacePublicInquiryUrl } from "@/features/settings/utils";
import {
  getWorkspaceInquiryFormPreviewPath,
  getWorkspaceInquiryFormsPath,
  getWorkspaceSettingsPath,
} from "@/features/workspaces/routes";
import { inquiryPageTemplateMeta } from "@/features/inquiries/page-config";
import { workspaceBusinessTypeMeta } from "@/features/inquiries/business-types";
import { getWorkspaceOwnerPageContext } from "../../_lib/page-context";

export default async function WorkspaceInquiryFormSettingsPage({
  params,
}: {
  params: Promise<{ formSlug: string }>;
}) {
  const { workspaceContext } = await getWorkspaceOwnerPageContext();
  const { formSlug } = await params;
  const settings = await getWorkspaceInquiryFormEditorForWorkspace(
    workspaceContext.workspace.id,
    formSlug,
  );

  if (!settings) {
    notFound();
  }

  const logoPreviewUrl = settings.logoStoragePath
    ? `/api/workspace/logo?v=${settings.updatedAt.getTime()}`
    : null;
  const previewHref = getWorkspaceInquiryFormPreviewPath(
    settings.slug,
    settings.formSlug,
  );
  const inquiryListHref = getWorkspaceInquiryFormsPath(settings.slug);
  const generalSettingsHref = getWorkspaceSettingsPath(settings.slug, "general");
  const publicInquiryHref = settings.isDefault
    ? getWorkspacePublicInquiryUrl(settings.slug)
    : getWorkspacePublicInquiryUrl(settings.slug, settings.formSlug);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title={settings.formName}
        description="Edit the form, public page, and actions for this inquiry flow."
        actions={
          <>
            <DashboardMetaPill>
              <FormInput className="size-3.5" />
              {workspaceBusinessTypeMeta[settings.businessType].label}
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
          <WorkspaceInquiryFormForm
            key={`${settings.updatedAt.getTime()}-${settings.formId}-form`}
            applyPresetAction={applyWorkspaceInquiryFormPresetAction.bind(
              null,
              settings.formSlug,
            )}
            saveAction={updateWorkspaceInquiryFormAction.bind(null, settings.formSlug)}
            settings={settings}
          />

          <WorkspaceInquiryPageForm
            action={updateWorkspaceInquiryPageAction.bind(null, settings.formSlug)}
            settings={settings}
            logoPreviewUrl={logoPreviewUrl}
            generalSettingsHref={generalSettingsHref}
          />
        </DashboardSidebarStack>

        <DashboardSidebarStack className="xl:sticky xl:top-[5.5rem]">
          <WorkspaceInquiryFormManageCard
            duplicateAction={duplicateWorkspaceInquiryFormAction}
            formId={settings.formId}
            isDefault={settings.isDefault}
            setDefaultAction={setDefaultWorkspaceInquiryFormAction}
          />

          <WorkspaceInquiryFormDangerZone
            activeFormCount={settings.activeFormCount}
            archiveAction={archiveWorkspaceInquiryFormFromDetailAction}
            deleteAction={deleteWorkspaceInquiryFormAction}
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
