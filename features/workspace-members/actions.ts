"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  workspaceMemberIdSchema,
  workspaceMemberInviteIdSchema,
  workspaceMemberInviteSchema,
  workspaceMemberInviteTokenSchema,
  workspaceMemberRoleUpdateSchema,
} from "@/features/workspace-members/schemas";
import {
  filterBusinessAssignmentsToScope,
  getInvitePermission,
  getManagedBusinessesForUser,
} from "@/features/workspace-members/permissions";
import type {
  WorkspaceMemberInviteAcceptActionState,
  WorkspaceMemberInviteActionState,
  WorkspaceMemberRemoveActionState,
  WorkspaceMemberRoleActionState,
} from "@/features/workspace-members/types";
import {
  acceptWorkspaceMemberInvite,
  cancelWorkspaceMemberInvite,
  createWorkspaceMemberInvite,
  declineWorkspaceMemberInvite,
  regenerateWorkspaceMemberInviteLink,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "@/features/workspace-members/mutations";
import { getWorkspaceMemberInvitePath } from "@/features/workspace-members/routes";
import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { getWorkspaceContextForUser } from "@/lib/db/workspace-access";
import { sendWorkspaceMemberInviteEmail } from "@/lib/resend/client";
import { env } from "@/lib/env";
import { hasFeatureAccess, planMeta, getRequiredPlan } from "@/lib/plans";
import { workspacesHubPath, getWorkspacePath } from "@/features/workspaces/routes";

function updateCacheTags(tags: string[]) {
  for (const tag of tags) {
    updateTag(tag);
  }
}

function getWorkspaceMembersCacheTags(workspaceId: string) {
  return [`workspace:${workspaceId}`, `workspace:${workspaceId}:members`];
}

async function requireWorkspaceOwnerOrAdmin(workspaceId: string) {
  const user = await requireUser();
  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);

  if (!workspace) {
    return { ok: false as const, error: "Workspace not found." };
  }

  if (workspace.memberRole !== "owner" && workspace.memberRole !== "admin") {
    return {
      ok: false as const,
      error: "Only workspace owners and admins can manage members.",
    };
  }

  return { ok: true as const, user, workspace };
}

export async function createWorkspaceMemberInviteAction(
  _prevState: WorkspaceMemberInviteActionState,
  formData: FormData,
): Promise<WorkspaceMemberInviteActionState> {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return { error: "Workspace not found." };
  }

  const user = await requireUser();
  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);

  if (!workspace) {
    return { error: "Workspace not found." };
  }

  // Determine invite permission based on workspace role + managed businesses
  const managedBusinesses = await getManagedBusinessesForUser(
    workspace.id,
    user.id,
  );
  const permission = getInvitePermission(
    workspace.memberRole,
    managedBusinesses.length,
  );

  if (!permission.canInvite) {
    return { error: "You don't have permission to invite members." };
  }

  if (!hasFeatureAccess(workspace.plan, "members")) {
    const requiredPlan = getRequiredPlan("members");

    return {
      error: `Team members require the ${requiredPlan ? planMeta[requiredPlan].label : "Business"} plan. ${requiredPlan ? planMeta[requiredPlan].ctaLabel : "Contact us to upgrade"} to invite members.`,
    };
  }

  // Parse business assignments from form data
  let businessAssignments: { businessId: string; role: string }[] = [];

  try {
    const assignmentsRaw = formData.get("businessAssignments");

    if (typeof assignmentsRaw === "string" && assignmentsRaw) {
      businessAssignments = JSON.parse(assignmentsRaw);
    }
  } catch {
    // Invalid JSON, proceed with empty assignments
  }

  const validationResult = workspaceMemberInviteSchema.safeParse({
    email: formData.get("email"),
    workspaceRole: formData.get("workspaceRole"),
    businessAssignments,
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the member details and try again.",
    );
  }

  // Enforce workspace role ceiling for scoped inviters
  let effectiveWorkspaceRole = validationResult.data.workspaceRole;

  if (
    permission.maxAssignableWorkspaceRole === "member" &&
    effectiveWorkspaceRole !== "member"
  ) {
    effectiveWorkspaceRole = "member";
  }

  // Enforce business assignment scope
  const allowedBusinessIds = new Set(
    managedBusinesses.map((b) => b.id),
  );
  const { valid: scopedAssignments, rejected } =
    filterBusinessAssignmentsToScope(
      validationResult.data.businessAssignments,
      permission.scope,
      allowedBusinessIds,
    );

  if (rejected.length > 0) {
    return {
      error:
        "You can only assign access to businesses you manage.",
    };
  }

  if (
    validationResult.data.email.toLowerCase() ===
    user.email.trim().toLowerCase()
  ) {
    return {
      error: "You already have access to this workspace.",
      fieldErrors: {
        email: ["Use a different email address."],
      },
    };
  }

  try {
    const result = await createWorkspaceMemberInvite({
      workspaceId: workspace.id,
      actorUserId: user.id,
      actorUserName: user.name,
      email: validationResult.data.email,
      workspaceRole: effectiveWorkspaceRole,
      businessAssignments: scopedAssignments,
    });

    if (!result.ok) {
      if (result.reason === "already-member") {
        return {
          error: "That email already has access to this workspace.",
          fieldErrors: {
            email: ["This person is already a member."],
          },
        };
      }

      return { error: "That workspace could not be found." };
    }

    const inviteUrl = new URL(
      getWorkspaceMemberInvitePath(result.token),
      env.BETTER_AUTH_URL,
    ).toString();
    let emailSent = false;

    try {
      emailSent = await sendWorkspaceMemberInviteEmail({
        inviteId: result.inviteId,
        token: result.token,
        email: result.email,
        workspaceName: result.workspace.name,
        inviterName: user.name,
        workspaceRole: result.workspaceRole,
        inviteUrl,
        workspaceId: workspace.id,
        userId: user.id,
      });
    } catch (error) {
      console.error("Failed to send workspace member invite email.", error);
    }

    updateCacheTags(getWorkspaceMembersCacheTags(workspace.id));
    revalidatePath(getWorkspacePath(workspace.slug));

    return {
      success: emailSent
        ? "Invite sent."
        : "Invite saved. Generate a fresh invite link from the pending invites list.",
    };
  } catch (error) {
    console.error("Failed to create workspace member invite.", error);

    return { error: "We couldn't save that invite right now." };
  }
}

export async function updateWorkspaceMemberRoleAction(
  membershipId: string,
  _prevState: WorkspaceMemberRoleActionState,
  formData: FormData,
): Promise<WorkspaceMemberRoleActionState> {
  const parsedMembershipId =
    workspaceMemberIdSchema.safeParse(membershipId);

  if (!parsedMembershipId.success) {
    return { error: "That member could not be found." };
  }

  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return { error: "Workspace not found." };
  }

  const access = await requireWorkspaceOwnerOrAdmin(workspaceId);

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, workspace } = access;
  const validationResult = workspaceMemberRoleUpdateSchema.safeParse({
    role: formData.get("role"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Choose a role and try again.",
    );
  }

  try {
    const result = await updateWorkspaceMemberRole({
      workspaceId: workspace.id,
      actorUserId: user.id,
      actorUserName: user.name,
      membershipId: parsedMembershipId.data,
      role: validationResult.data.role,
    });

    if (!result.ok) {
      if (result.reason === "self-change-blocked") {
        return {
          error:
            "Change your own role from a future ownership-transfer flow instead.",
        };
      }

      if (result.reason === "owner-protected") {
        return { error: "Owner access cannot be changed here." };
      }

      return { error: "That member could not be found." };
    }

    updateCacheTags(getWorkspaceMembersCacheTags(workspace.id));
    revalidatePath(getWorkspacePath(workspace.slug));

    return { success: "Member role updated." };
  } catch (error) {
    console.error("Failed to update workspace member role.", error);

    return { error: "We couldn't update that member right now." };
  }
}

export async function removeWorkspaceMemberAction(
  membershipId: string,
  _prevState: WorkspaceMemberRemoveActionState,
  _formData: FormData,
): Promise<WorkspaceMemberRemoveActionState> {
  void _prevState;
  const parsedMembershipId =
    workspaceMemberIdSchema.safeParse(membershipId);

  if (!parsedMembershipId.success) {
    return { error: "That member could not be found." };
  }

  const workspaceId = _formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return { error: "Workspace not found." };
  }

  const access = await requireWorkspaceOwnerOrAdmin(workspaceId as string);

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, workspace } = access;

  try {
    const result = await removeWorkspaceMember({
      workspaceId: workspace.id,
      actorUserId: user.id,
      actorUserName: user.name,
      membershipId: parsedMembershipId.data,
    });

    if (!result.ok) {
      if (result.reason === "self-remove-blocked") {
        return { error: "You can't remove yourself here." };
      }

      if (result.reason === "owner-protected") {
        return { error: "Owners can't be removed from this screen." };
      }

      return { error: "That member could not be found." };
    }

    updateCacheTags(getWorkspaceMembersCacheTags(workspace.id));
    revalidatePath(getWorkspacePath(workspace.slug));

    return { success: "Member removed." };
  } catch (error) {
    console.error("Failed to remove workspace member.", error);

    return { error: "We couldn't remove that member right now." };
  }
}

export async function cancelWorkspaceMemberInviteAction(
  inviteId: string,
  _prevState: WorkspaceMemberRemoveActionState,
  _formData: FormData,
): Promise<WorkspaceMemberRemoveActionState> {
  void _prevState;
  const parsedInviteId =
    workspaceMemberInviteIdSchema.safeParse(inviteId);

  if (!parsedInviteId.success) {
    return { error: "That invite could not be found." };
  }

  const workspaceId = _formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return { error: "Workspace not found." };
  }

  const access = await requireWorkspaceOwnerOrAdmin(workspaceId as string);

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, workspace } = access;

  try {
    const result = await cancelWorkspaceMemberInvite({
      workspaceId: workspace.id,
      actorUserId: user.id,
      actorUserName: user.name,
      inviteId: parsedInviteId.data,
    });

    if (!result.ok) {
      return { error: "That invite could not be found." };
    }

    updateCacheTags(getWorkspaceMembersCacheTags(workspace.id));
    revalidatePath(getWorkspacePath(workspace.slug));

    return { success: "Invite canceled." };
  } catch (error) {
    console.error("Failed to cancel workspace member invite.", error);

    return { error: "We couldn't cancel that invite right now." };
  }
}

export async function copyWorkspaceMemberInviteLinkAction(
  inviteId: string,
  workspaceId: string,
) {
  const parsedInviteId =
    workspaceMemberInviteIdSchema.safeParse(inviteId);

  if (!parsedInviteId.success) {
    return { error: "That invite could not be found." };
  }

  const access = await requireWorkspaceOwnerOrAdmin(workspaceId);

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, workspace } = access;

  try {
    const result = await regenerateWorkspaceMemberInviteLink({
      workspaceId: workspace.id,
      actorUserId: user.id,
      actorUserName: user.name,
      inviteId: parsedInviteId.data,
    });

    if (!result.ok) {
      return { error: "That invite could not be found." };
    }

    updateCacheTags(getWorkspaceMembersCacheTags(workspace.id));

    return {
      inviteUrl: new URL(
        getWorkspaceMemberInvitePath(result.token),
        env.BETTER_AUTH_URL,
      ).toString(),
    };
  } catch (error) {
    console.error(
      "Failed to regenerate workspace member invite link.",
      error,
    );

    return { error: "We couldn't create a fresh invite link right now." };
  }
}

export async function acceptWorkspaceMemberInviteAction(
  token: string,
  _prevState: WorkspaceMemberInviteAcceptActionState,
  _formData: FormData,
): Promise<WorkspaceMemberInviteAcceptActionState> {
  void _prevState;
  void _formData;
  const parsedToken =
    workspaceMemberInviteTokenSchema.safeParse(token);
  const invitePath = getWorkspaceMemberInvitePath(token);
  const loginPath = `/login?next=${encodeURIComponent(invitePath)}`;

  if (!parsedToken.success) {
    return { error: "That invite link is not valid." };
  }

  const user = await requireUser(loginPath);
  let result: Awaited<ReturnType<typeof acceptWorkspaceMemberInvite>>;

  try {
    result = await acceptWorkspaceMemberInvite({
      token: parsedToken.data,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
    });
  } catch (error) {
    console.error("Failed to accept workspace member invite.", error);

    return { error: "We couldn't accept that invite right now." };
  }

  if (!result.ok) {
    if (result.reason === "email-mismatch") {
      return {
        error: `Sign in with ${result.invitedEmail} to accept this invite.`,
      };
    }

    return {
      error:
        result.reason === "expired"
          ? "This invite has expired."
          : "That invite link is not valid.",
    };
  }

  updateCacheTags(getWorkspaceMembersCacheTags(result.workspaceId));
  revalidatePath(workspacesHubPath);
  revalidatePath(getWorkspacePath(result.workspaceSlug));
  redirect(getWorkspacePath(result.workspaceSlug));
}

export async function declineWorkspaceMemberInviteAction(
  token: string,
  _prevState: WorkspaceMemberInviteAcceptActionState,
  _formData: FormData,
): Promise<WorkspaceMemberInviteAcceptActionState> {
  void _prevState;
  void _formData;
  const parsedToken =
    workspaceMemberInviteTokenSchema.safeParse(token);
  const invitePath = getWorkspaceMemberInvitePath(token);
  const loginPath = `/login?next=${encodeURIComponent(invitePath)}`;

  if (!parsedToken.success) {
    return { error: "That invite link is not valid." };
  }

  const user = await requireUser(loginPath);
  let result: Awaited<ReturnType<typeof declineWorkspaceMemberInvite>>;

  try {
    result = await declineWorkspaceMemberInvite({
      token: parsedToken.data,
      userEmail: user.email,
    });
  } catch (error) {
    console.error("Failed to decline workspace member invite.", error);

    return { error: "We couldn't decline that invite right now." };
  }

  if (!result.ok) {
    if (result.reason === "email-mismatch") {
      return {
        error: `Sign in with ${result.invitedEmail} to decline this invite.`,
      };
    }

    return {
      error:
        result.reason === "expired"
          ? "This invite has expired."
          : "That invite link is not valid.",
    };
  }

  redirect(workspacesHubPath);
}
