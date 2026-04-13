"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import {
  getWorkspaceContextForUser,
  getWorkspacesForUser,
} from "@/lib/db/workspace-access";
import {
  renameWorkspace,
  createWorkspace,
} from "@/features/workspaces/mutations";
import {
  getWorkspacePath,
  workspacesHubPath,
} from "@/features/workspaces/routes";
import type {
  WorkspaceSettingsActionState,
  CreateWorkspaceActionState,
} from "@/features/workspaces/types";

export async function renameWorkspaceAction(
  _prev: WorkspaceSettingsActionState,
  formData: FormData,
): Promise<WorkspaceSettingsActionState> {
  const user = await requireUser();

  const workspaceId = formData.get("workspaceId");
  const name = formData.get("name");

  if (typeof workspaceId !== "string" || typeof name !== "string") {
    return { error: "Invalid input." };
  }

  // Verify ownership
  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);

  if (!workspace) {
    return { error: "Workspace not found." };
  }

  if (workspace.memberRole !== "owner") {
    return { error: "Only workspace owners can rename the workspace." };
  }

  const result = await renameWorkspace(workspace.id, { name });

  if ("error" in result) {
    return result;
  }

  revalidatePath(workspacesHubPath);
  revalidatePath(getWorkspacePath(workspace.slug));

  return { success: "Workspace name updated." };
}

export async function createWorkspaceAction(
  _prev: CreateWorkspaceActionState,
  formData: FormData,
): Promise<CreateWorkspaceActionState> {
  const user = await requireUser();

  const name = formData.get("name");

  if (typeof name !== "string") {
    return { error: "Invalid input." };
  }

  const result = await createWorkspace(user.id, { name });

  if ("error" in result) {
    return result;
  }

  revalidatePath(workspacesHubPath);

  if (result.workspace) {
    redirect(getWorkspacePath(result.workspace.slug));
  }

  return { success: "Workspace created." };
}
