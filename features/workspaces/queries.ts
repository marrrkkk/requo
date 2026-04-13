import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  businesses,
  user,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import type {
  WorkspaceListItem,
  WorkspaceOverview,
  WorkspaceSettingsView,
} from "@/features/workspaces/types";

/**
 * Get all workspaces for a user, with business count.
 */
export async function getWorkspaceListForUser(
  userId: string,
): Promise<WorkspaceListItem[]> {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
      memberRole: workspaceMembers.role,
      businessCount: count(businesses.id),
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .leftJoin(businesses, eq(businesses.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .groupBy(
      workspaces.id,
      workspaces.name,
      workspaces.slug,
      workspaces.plan,
      workspaceMembers.role,
    )
    .orderBy(asc(workspaces.name));

  return rows;
}

/**
 * Get full workspace overview by slug for a user.
 */
export async function getWorkspaceOverviewBySlug(
  userId: string,
  workspaceSlug: string,
): Promise<WorkspaceOverview | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
      createdAt: workspaces.createdAt,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);

  if (!workspace) {
    return null;
  }

  const [businessRows, memberRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        businessType: businesses.businessType,
        logoStoragePath: businesses.logoStoragePath,
        defaultCurrency: businesses.defaultCurrency,
      })
      .from(businesses)
      .where(eq(businesses.workspaceId, workspace.id))
      .orderBy(asc(businesses.name)),
    db
      .select({
        userId: workspaceMembers.userId,
        name: user.name,
        email: user.email,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.createdAt,
      })
      .from(workspaceMembers)
      .innerJoin(user, eq(workspaceMembers.userId, user.id))
      .where(eq(workspaceMembers.workspaceId, workspace.id))
      .orderBy(asc(user.name)),
  ]);

  return {
    ...workspace,
    businesses: businessRows,
    members: memberRows,
  };
}

/**
 * Get workspace settings by slug.
 */
export async function getWorkspaceSettingsBySlug(
  workspaceSlug: string,
): Promise<WorkspaceSettingsView | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
    })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);

  return workspace ?? null;
}
