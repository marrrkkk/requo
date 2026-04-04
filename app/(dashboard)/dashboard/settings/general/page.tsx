import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { updateWorkspaceSettingsAction } from "@/features/settings/actions";
import { WorkspaceSettingsForm } from "@/features/settings/components/workspace-settings-form";
import { getWorkspaceSettingsForWorkspace } from "@/features/settings/queries";
import { getWorkspaceOwnerPageContext } from "../_lib/page-context";

export default async function WorkspaceGeneralSettingsPage() {
  const { user, workspaceContext } = await getWorkspaceOwnerPageContext();
  const settings = await getWorkspaceSettingsForWorkspace(
    workspaceContext.workspace.id,
  );

  if (!settings) {
    notFound();
  }

  const logoPreviewUrl = settings.logoStoragePath
    ? `/api/workspace/logo?v=${settings.updatedAt.getTime()}`
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="General settings"
        description="Manage business identity, writing defaults, and owner notification preferences."
      />

      <WorkspaceSettingsForm
        action={updateWorkspaceSettingsAction}
        fallbackContactEmail={user.email}
        logoPreviewUrl={logoPreviewUrl}
        settings={settings}
      />
    </>
  );
}
