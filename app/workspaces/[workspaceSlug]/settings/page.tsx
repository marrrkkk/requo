import {
  getWorkspaceDeletionPreflightBySlug,
} from "@/features/workspaces/queries";
import { WorkspaceSettingsForm } from "@/features/workspaces/components/workspace-settings-form";
import {
  cancelWorkspaceDeletionAction,
  requestWorkspaceDeletionAction,
} from "@/features/workspaces/actions";
import { WorkspaceDeletionPanel } from "@/features/workspaces/components/workspace-deletion-panel";
import { getWorkspaceOwnerPageContext } from "./_lib/page-context";

type WorkspaceSettingsIndexPageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceSettingsIndexPage({
  params,
}: WorkspaceSettingsIndexPageProps) {
  const { workspaceSlug } = await params;
  const { user, workspace } = await getWorkspaceOwnerPageContext(workspaceSlug);
  const deletionPreflight = await getWorkspaceDeletionPreflightBySlug(
    user.id,
    workspace.slug,
  );

  if (!deletionPreflight) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <WorkspaceSettingsForm workspace={workspace} />
      <WorkspaceDeletionPanel
        cancelDeletionAction={cancelWorkspaceDeletionAction.bind(
          null,
          workspace.id,
          workspace.slug,
        )}
        preflight={deletionPreflight}
        requestDeletionAction={requestWorkspaceDeletionAction.bind(
          null,
          workspace.id,
          workspace.slug,
        )}
      />
    </div>
  );
}
