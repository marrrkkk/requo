import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { getWorkspacePath } from "@/features/workspaces/routes";
import { getWorkspaceSettingsBySlug } from "@/features/workspaces/queries";
import { requireSession } from "@/lib/auth/session";

export const getWorkspaceSettingsPageContext = cache(async (
  workspaceSlug: string,
) => {
  const session = await requireSession();
  const workspace = await getWorkspaceSettingsBySlug(session.user.id, workspaceSlug);

  if (!workspace) {
    notFound();
  }

  if (workspace.memberRole !== "owner") {
    redirect(getWorkspacePath(workspace.slug));
  }

  return {
    user: session.user,
    workspace,
  };
});

export const getWorkspaceOwnerPageContext = cache(async (
  workspaceSlug: string,
) => {
  return getWorkspaceSettingsPageContext(workspaceSlug);
});
