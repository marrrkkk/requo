"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import {
  getWorkspaceContextForUser,
} from "@/lib/db/workspace-access";
import {
  cancelScheduledWorkspaceDeletion,
  renameWorkspace,
  createWorkspace,
  requestWorkspaceDeletion,
  transferWorkspaceOwnership,
} from "@/features/workspaces/mutations";
import {
  getWorkspacePath,
  getWorkspaceSettingsPath,
  workspacesHubPath,
} from "@/features/workspaces/routes";
import type {
  WorkspaceSettingsActionState,
  CreateWorkspaceActionState,
  WorkspaceDeletionActionState,
  WorkspaceOwnershipTransferActionState,
} from "@/features/workspaces/types";

export async function renameWorkspaceAction(
  prev: WorkspaceSettingsActionState,
  formData: FormData,
): Promise<WorkspaceSettingsActionState> {
  void prev;
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
  prev: CreateWorkspaceActionState,
  formData: FormData,
): Promise<CreateWorkspaceActionState> {
  void prev;
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

export async function requestWorkspaceDeletionAction(
  workspaceId: string,
  workspaceSlug: string,
  prev: WorkspaceDeletionActionState,
  formData: FormData,
): Promise<WorkspaceDeletionActionState> {
  void prev;
  void formData;
  const user = await requireUser();
  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);

  if (!workspace) {
    return {
      error: "Workspace not found.",
    };
  }

  if (workspace.memberRole !== "owner") {
    return {
      error: "Only the workspace owner can delete the workspace.",
    };
  }

  const result = await requestWorkspaceDeletion(workspaceId, user.id);

  if (!result.ok) {
    if (result.reason === "cancellation-required") {
      return {
        error:
          "Cancel the workspace subscription first. Deleting a workspace does not cancel billing for you.",
      };
    }

    if (result.reason === "already-deleted") {
      redirect(workspacesHubPath);
    }

    return {
      error: "We couldn't start workspace deletion right now.",
    };
  }

  revalidatePath(workspacesHubPath);
  revalidatePath(getWorkspacePath(workspaceSlug));
  revalidatePath(getWorkspaceSettingsPath(workspaceSlug));

  if (result.mode === "deleted") {
    redirect(workspacesHubPath);
  }

  return {
    success: result.scheduledDeletionAt
      ? "Workspace deletion scheduled."
      : "Workspace deleted.",
  };
}

export async function cancelWorkspaceDeletionAction(
  workspaceId: string,
  workspaceSlug: string,
  prev: WorkspaceDeletionActionState,
  formData: FormData,
): Promise<WorkspaceDeletionActionState> {
  void prev;
  void formData;
  const user = await requireUser();
  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);

  if (!workspace) {
    return {
      error: "Workspace not found.",
    };
  }

  if (workspace.memberRole !== "owner") {
    return {
      error: "Only the workspace owner can manage workspace deletion.",
    };
  }

  const result = await cancelScheduledWorkspaceDeletion(workspaceId, user.id);

  if (!result.ok) {
    if (result.reason === "not-scheduled") {
      return {
        success: "Workspace deletion schedule cleared.",
      };
    }

    return {
      error: "We couldn't cancel workspace deletion right now.",
    };
  }

  revalidatePath(workspacesHubPath);
  revalidatePath(getWorkspacePath(workspaceSlug));
  revalidatePath(getWorkspaceSettingsPath(workspaceSlug));

  return {
    success: "Workspace deletion schedule cancelled.",
  };
}

export async function transferWorkspaceOwnershipAction(
  workspaceId: string,
  workspaceSlug: string,
  prev: WorkspaceOwnershipTransferActionState,
  formData: FormData,
): Promise<WorkspaceOwnershipTransferActionState> {
  void prev;
  const targetMembershipId = formData.get("targetMembershipId");

  if (typeof targetMembershipId !== "string" || !targetMembershipId.trim()) {
    return { error: "Select a member to transfer ownership to." };
  }

  const user = await requireUser();
  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);

  if (!workspace) {
    return { error: "Workspace not found." };
  }

  if (workspace.memberRole !== "owner") {
    return { error: "Only the workspace owner can transfer ownership." };
  }

  try {
    const result = await transferWorkspaceOwnership({
      workspaceId: workspace.id,
      actorUserId: user.id,
      actorUserName: user.name,
      targetMembershipId: targetMembershipId.trim(),
    });

    if (!result.ok) {
      if (result.reason === "self-transfer") {
        return { error: "You already own this workspace." };
      }

      if (result.reason === "pending-deletion") {
        return {
          error:
            "Cancel the scheduled workspace deletion before transferring ownership.",
        };
      }

      if (result.reason === "target-not-member") {
        return { error: "That member could not be found in this workspace." };
      }

      return { error: "We couldn't transfer ownership right now." };
    }

    revalidatePath(workspacesHubPath);
    revalidatePath(getWorkspacePath(workspaceSlug));
    revalidatePath(getWorkspaceSettingsPath(workspaceSlug));

    return {
      success: `Ownership transferred to ${result.newOwnerName}.`,
    };
  } catch (error) {
    console.error("Failed to transfer workspace ownership.", error);

    return { error: "We couldn't transfer ownership right now." };
  }
}
