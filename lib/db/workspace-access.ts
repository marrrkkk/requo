import "server-only";

/**
 * Server-side workspace access helpers.
 *
 * Provides workspace context resolution, ownership checks, and membership
 * queries for workspace-scoped operations.
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

import type { WorkspacePlan } from "@/lib/plans/plans";
import type { WorkspaceMemberRole } from "@/lib/db/schema/workspaces";
import {
  getWorkspaceScopeTag,
  getUserMembershipsCacheTags,
  membershipShellCacheLife,
} from "@/lib/cache/shell-tags";
import { uniqueCacheTags } from "@/lib/cache/business-tags";
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
  scheduledDeletionAt: Date | null;
  deletedAt: Date | null;
  membershipId: string;
  memberRole: WorkspaceMemberRole;
};

/**
 * Returns all workspaces a user belongs to, with membership info.
 */
async function getCachedWorkspacesForUser(userId: string) {
  "use cache";

  cacheLife(membershipShellCacheLife);
  cacheTag(...getUserMembershipsCacheTags(userId));

  const rows = await db
    .select({
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      workspacePlan: workspaces.plan,
      ownerUserId: workspaces.ownerUserId,
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
      deletedAt: workspaces.deletedAt,
      membershipId: workspaceMembers.id,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)),
    )
    .orderBy(asc(workspaces.name), asc(workspaces.createdAt));

  const workspaceTags = uniqueCacheTags(
    rows.map((row) => getWorkspaceScopeTag(row.workspaceId)),
  );

  if (workspaceTags.length > 0) {
    cacheTag(...workspaceTags);
  }

  return rows.map((row) => ({
    id: row.workspaceId,
    name: row.workspaceName,
    slug: row.workspaceSlug,
    plan: row.workspacePlan as WorkspacePlan,
    ownerUserId: row.ownerUserId,
    scheduledDeletionAt: row.scheduledDeletionAt,
    deletedAt: row.deletedAt,
    membershipId: row.membershipId,
    memberRole: row.memberRole,
  })) satisfies WorkspaceContext[];
}

export const getWorkspacesForUser = cache(async (userId: string) => {
  return getCachedWorkspacesForUser(userId);
});

/**
 * Returns workspace context for a specific workspace + user combination.
 * Provide either workspaceId or workspaceSlug (slug is used when ID is not available, e.g. from URL params).
 */
async function getCachedWorkspaceContextForUser(
  userId: string,
  workspaceId?: string,
  workspaceSlug?: string,
) {
  "use cache";

  cacheLife(membershipShellCacheLife);
  cacheTag(...getUserMembershipsCacheTags(userId));

  if (!workspaceId && !workspaceSlug) {
    return null;
  }

  const condition = workspaceId
    ? eq(workspaces.id, workspaceId)
    : eq(workspaces.slug, workspaceSlug!);

  const [row] = await db
    .select({
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      workspacePlan: workspaces.plan,
      ownerUserId: workspaces.ownerUserId,
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
      deletedAt: workspaces.deletedAt,
      membershipId: workspaceMembers.id,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        condition,
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  cacheTag(getWorkspaceScopeTag(row.workspaceId));

  return {
    id: row.workspaceId,
    name: row.workspaceName,
    slug: row.workspaceSlug,
    plan: row.workspacePlan as WorkspacePlan,
    ownerUserId: row.ownerUserId,
    scheduledDeletionAt: row.scheduledDeletionAt,
    deletedAt: row.deletedAt,
    membershipId: row.membershipId,
    memberRole: row.memberRole,
  } satisfies WorkspaceContext;
}

export const getWorkspaceContextForUser = cache(
  async (userId: string, workspaceId?: string, workspaceSlug?: string) => {
    return getCachedWorkspaceContextForUser(userId, workspaceId, workspaceSlug);
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
        scheduledDeletionAt: workspaces.scheduledDeletionAt,
        deletedAt: workspaces.deletedAt,
      })
      .from(businesses)
      .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
      .where(and(eq(businesses.id, businessId), isNull(workspaces.deletedAt)))
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
      scheduledDeletionAt: row.scheduledDeletionAt,
      deletedAt: row.deletedAt,
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
