import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import type {
  WorkspaceMemberInviteAcceptanceView,
  WorkspaceMembersSettingsView,
  WorkspaceMemberAssignableRole,
  BusinessAssignment,
} from "@/features/workspace-members/types";
import { workspaceMemberAssignableRoles } from "@/features/workspace-members/types";
import { getWorkspaceMemberInviteLookupCondition } from "@/features/workspace-members/invite-tokens";
import { db } from "@/lib/db/client";
import {
  businesses,
  user,
  workspaceMemberInvites,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { getBusinessViewCondition } from "@/features/businesses/lifecycle";

function getMemberRoleSortExpression() {
  return sql`case
    when ${workspaceMembers.role} = 'owner' then 0
    when ${workspaceMembers.role} = 'admin' then 1
    else 2
  end`;
}

function getInviteRoleSortExpression() {
  return sql`case
    when ${workspaceMemberInvites.workspaceRole} = 'admin' then 0
    else 1
  end`;
}

function isAssignableRole(value: unknown): value is WorkspaceMemberAssignableRole {
  return (
    typeof value === "string" &&
    (workspaceMemberAssignableRoles as readonly string[]).includes(value)
  );
}

function parseBusinessAssignments(raw: unknown): BusinessAssignment[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter(
    (item): item is BusinessAssignment =>
      typeof item === "object" &&
      item !== null &&
      typeof item.businessId === "string" &&
      typeof item.role === "string",
  );
}

export async function getWorkspaceMembersSettingsForWorkspace(
  workspaceId: string,
  currentUserId: string,
): Promise<Omit<WorkspaceMembersSettingsView, "invitePermission"> | null> {
  const [workspaceRow, memberRows, inviteRows, businessRows] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1),
    db
      .select({
        membershipId: workspaceMembers.id,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.createdAt,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(workspaceMembers)
      .innerJoin(user, eq(workspaceMembers.userId, user.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(
        getMemberRoleSortExpression(),
        asc(user.name),
        asc(user.email),
        asc(workspaceMembers.createdAt),
      ),
    db
      .select({
        inviteId: workspaceMemberInvites.id,
        inviterUserId: workspaceMemberInvites.inviterUserId,
        email: workspaceMemberInvites.email,
        workspaceRole: workspaceMemberInvites.workspaceRole,
        businessAssignments: workspaceMemberInvites.businessAssignments,
        createdAt: workspaceMemberInvites.createdAt,
        expiresAt: workspaceMemberInvites.expiresAt,
      })
      .from(workspaceMemberInvites)
      .where(eq(workspaceMemberInvites.workspaceId, workspaceId))
      .orderBy(
        getInviteRoleSortExpression(),
        desc(workspaceMemberInvites.createdAt),
      ),
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
      })
      .from(businesses)
      .where(
        and(
          eq(businesses.workspaceId, workspaceId),
          getBusinessViewCondition("active"),
        ),
      )
      .orderBy(asc(businesses.name)),
  ]);

  const workspace = workspaceRow[0];

  if (!workspace) {
    return null;
  }

  const inviterIds = Array.from(
    new Set(inviteRows.map((invite) => invite.inviterUserId)),
  );
  const inviterRows = inviterIds.length
    ? await db
        .select({
          id: user.id,
          name: user.name,
        })
        .from(user)
        .where(inArray(user.id, inviterIds))
    : [];
  const inviterNames = new Map(inviterRows.map((row) => [row.id, row.name]));

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    currentUserId,
    members: memberRows.map((member) => ({
      membershipId: member.membershipId,
      userId: member.userId,
      name: member.name,
      email: member.email,
      image: member.image ?? null,
      role: member.role,
      joinedAt: member.joinedAt,
      isCurrentUser: member.userId === currentUserId,
    })),
    invites: inviteRows
      .filter((invite) => isAssignableRole(invite.workspaceRole))
      .map((invite) => ({
        inviteId: invite.inviteId,
        email: invite.email,
        workspaceRole: invite.workspaceRole as WorkspaceMemberAssignableRole,
        businessAssignments: parseBusinessAssignments(
          invite.businessAssignments,
        ),
        inviterName: inviterNames.get(invite.inviterUserId) ?? "Workspace owner",
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      })),
    businesses: businessRows,
  };
}

export async function getWorkspaceMemberInviteByToken(
  token: string,
  currentUserId?: string | null,
): Promise<WorkspaceMemberInviteAcceptanceView | null> {
  const [invite] = await db
    .select({
      inviteId: workspaceMemberInvites.id,
      inviterUserId: workspaceMemberInvites.inviterUserId,
      email: workspaceMemberInvites.email,
      workspaceRole: workspaceMemberInvites.workspaceRole,
      businessAssignments: workspaceMemberInvites.businessAssignments,
      expiresAt: workspaceMemberInvites.expiresAt,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
    })
    .from(workspaceMemberInvites)
    .innerJoin(
      workspaces,
      eq(workspaceMemberInvites.workspaceId, workspaces.id),
    )
    .where(getWorkspaceMemberInviteLookupCondition(token))
    .limit(1);

  if (!invite) {
    return null;
  }

  if (!isAssignableRole(invite.workspaceRole)) {
    return null;
  }

  const [[inviter], membership] = await Promise.all([
    db
      .select({
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, invite.inviterUserId))
      .limit(1),
    currentUserId
      ? db
          .select({
            role: workspaceMembers.role,
          })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, invite.workspaceId),
              eq(workspaceMembers.userId, currentUserId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    inviteId: invite.inviteId,
    token,
    email: invite.email,
    workspaceRole: invite.workspaceRole as WorkspaceMemberAssignableRole,
    businessAssignments: parseBusinessAssignments(invite.businessAssignments),
    workspace: {
      id: invite.workspaceId,
      name: invite.workspaceName,
      slug: invite.workspaceSlug,
    },
    inviter: {
      name: inviter?.name ?? "Workspace owner",
      email: inviter?.email ?? "",
    },
    expiresAt: invite.expiresAt,
    currentWorkspaceMembershipRole: membership[0]?.role ?? null,
  };
}

/**
 * Returns non-owner workspace members eligible for ownership transfer.
 * Lightweight query used by the transfer panel on the settings page.
 */
export async function getEligibleOwnershipTransferTargets(
  workspaceId: string,
  currentOwnerUserId: string,
) {
  const rows = await db
    .select({
      membershipId: workspaceMembers.id,
      name: user.name,
      email: user.email,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        sql`${workspaceMembers.userId} != ${currentOwnerUserId}`,
      ),
    )
    .orderBy(getMemberRoleSortExpression(), asc(user.name));

  return rows;
}
