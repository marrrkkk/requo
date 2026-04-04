import { Globe, LayoutTemplate, PanelsTopLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { DashboardMetaPill } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { updateWorkspaceInquiryPageAction } from "@/features/settings/actions";
import { WorkspaceInquiryPageForm } from "@/features/settings/components/workspace-inquiry-page-form";
import { getWorkspaceInquiryPageSettingsForWorkspace } from "@/features/settings/queries";
import { getWorkspacePublicInquiryUrl } from "@/features/settings/utils";
import {
  getWorkspaceInquiryPagePreviewPath,
  getWorkspaceSettingsPath,
} from "@/features/workspaces/routes";
import { inquiryPageTemplateMeta } from "@/features/inquiries/page-config";
import { getWorkspaceOwnerPageContext } from "../_lib/page-context";

export default async function WorkspaceInquiryPageSettingsPage() {
  const { workspaceContext } = await getWorkspaceOwnerPageContext();
  const settings = await getWorkspaceInquiryPageSettingsForWorkspace(
    workspaceContext.workspace.id,
  );

  if (!settings) {
    notFound();
  }

  const logoPreviewUrl = settings.logoStoragePath
    ? `/api/workspace/logo?v=${settings.updatedAt.getTime()}`
    : null;
  const previewHref = getWorkspaceInquiryPagePreviewPath(settings.slug);
  const generalSettingsHref = getWorkspaceSettingsPath(settings.slug, "general");
  const publicInquiryHref = getWorkspacePublicInquiryUrl(settings.slug);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Inquiry page"
        description="Customize the saved public inquiry page layout, workspace-brand presentation, and the supporting cards customers see before they submit a request."
        actions={
          <>
            <DashboardMetaPill>
              <Globe className="size-3.5" />
              {settings.publicInquiryEnabled ? "Public page live" : "Public page off"}
            </DashboardMetaPill>
            <DashboardMetaPill>
              <LayoutTemplate className="size-3.5" />
              {inquiryPageTemplateMeta[settings.inquiryPageConfig.template].label}
            </DashboardMetaPill>
            <DashboardMetaPill>
              <PanelsTopLeft className="size-3.5" />
              {settings.inquiryPageConfig.cards.length} card
              {settings.inquiryPageConfig.cards.length === 1 ? "" : "s"}
            </DashboardMetaPill>
          </>
        }
      />

      <WorkspaceInquiryPageForm
        action={updateWorkspaceInquiryPageAction}
        settings={settings}
        logoPreviewUrl={logoPreviewUrl}
        generalSettingsHref={generalSettingsHref}
        previewHref={previewHref}
        publicInquiryHref={publicInquiryHref}
      />
    </>
  );
}
