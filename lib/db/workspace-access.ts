import "server-only";

/**
 * Server-side workspace access helpers.
 *
 * Provides workspace context resolution, ownership checks, and membership
 * queries for workspace-scoped operations.
 */

import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";

import type { WorkspacePlan } from "@/lib/plans/plans";
import type { WorkspaceMemberRole } from "@/lib/db/schema/workspaces";
import { db } from "@/lib/db/client";
import {
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

export type WorkspaceContext = {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  ownerUserId: string;
  membershipId: string;
  memberRole: WorkspaceMemberRole;
};

/**
 * Returns all workspaces a user belongs to, with membership info.
 */
export const getWorkspacesForUser = cache(async (userId: string) => {
  const rows = await db
    .select({
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      workspacePlan: workspaces.plan,
      ownerUserId: workspaces.ownerUserId,
      membershipId: workspaceMembers.id,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(asc(workspaces.name), asc(workspaces.createdAt));

  return rows.map((row) => ({
    id: row.workspaceId,
    name: row.workspaceName,
    slug: row.workspaceSlug,
    plan: row.workspacePlan as WorkspacePlan,
    ownerUserId: row.ownerUserId,
    membershipId: row.membershipId,
    memberRole: row.memberRole,
  })) satisfies WorkspaceContext[];
});

/**
 * Returns workspace context for a specific workspace + user combination.
 */
export const getWorkspaceContextForUser = cache(
  async (userId: string, workspaceId: string) => {
    const [row] = await db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        workspacePlan: workspaces.plan,
        ownerUserId: workspaces.ownerUserId,
        membershipId: workspaceMembers.id,
        memberRole: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaces.id, workspaceId),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.workspaceId,
      name: row.workspaceName,
      slug: row.workspaceSlug,
      plan: row.workspacePlan as WorkspacePlan,
      ownerUserId: row.ownerUserId,
      membershipId: row.membershipId,
      memberRole: row.memberRole,
    } satisfies WorkspaceContext;
  },
);

/**
 * Returns the workspace that a business belongs to.
 */
export const getWorkspaceForBusiness = cache(
  async (businessId: string) => {
    const { businesses } = await import("@/lib/db/schema");

    const [row] = await db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        workspacePlan: workspaces.plan,
        ownerUserId: workspaces.ownerUserId,
      })
      .from(businesses)
      .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.workspaceId,
      name: row.workspaceName,
      slug: row.workspaceSlug,
      plan: row.workspacePlan as WorkspacePlan,
      ownerUserId: row.ownerUserId,
    };
  },
);

/**
 * Checks whether a user is the workspace owner.
 */
export function isWorkspaceOwner(
  role: WorkspaceMemberRole,
): boolean {
  return role === "owner";
}
