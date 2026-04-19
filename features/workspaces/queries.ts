import "server-only";

import { and, asc, count, eq, isNull } from "drizzle-orm";

import {
  getNonDeletedBusinessCondition,
  getBusinessRecordState,
  getBusinessViewCondition,
} from "@/features/businesses/lifecycle";
import {
  getWorkspaceDeletionEffectiveAt,
  getWorkspaceDeletionState,
  requiresWorkspaceSubscriptionCancellation,
} from "@/features/workspaces/deletion";
import { getWorkspaceSubscription } from "@/lib/billing/subscription-service";
import { db } from "@/lib/db/client";
import {
  businesses,
  businessMembers,
  user,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import type {
  WorkspaceDeletionPreflight,
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
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
      memberRole: workspaceMembers.role,
      businessCount: count(businesses.id),
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .leftJoin(
      businesses,
      and(
        eq(businesses.workspaceId, workspaces.id),
        getBusinessViewCondition("active"),
      ),
    )
    .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
    .groupBy(
      workspaces.id,
      workspaces.name,
      workspaces.slug,
      workspaces.plan,
      workspaces.scheduledDeletionAt,
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
  businessView: "active" | "archived" | "trash" = "active",
): Promise<WorkspaceOverview | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
      createdAt: workspaces.createdAt,
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.slug, workspaceSlug),
        isNull(workspaces.deletedAt),
      ),
    )
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
        recordState: getBusinessRecordState,
        archivedAt: businesses.archivedAt,
        deletedAt: businesses.deletedAt,
        viewerRole: businessMembers.role,
      })
      .from(businesses)
      .leftJoin(
        businessMembers,
        and(
          eq(businessMembers.businessId, businesses.id),
          eq(businessMembers.userId, userId),
        ),
      )
      .where(
        and(
          eq(businesses.workspaceId, workspace.id),
          getBusinessViewCondition(businessView),
        ),
      )
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
  userId: string,
  workspaceSlug: string,
): Promise<WorkspaceSettingsView | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.slug, workspaceSlug),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);

  return workspace ?? null;
}

export async function getWorkspaceDeletionPreflightBySlug(
  userId: string,
  workspaceSlug: string,
): Promise<WorkspaceDeletionPreflight | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      ownerUserId: workspaces.ownerUserId,
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
      deletedAt: workspaces.deletedAt,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.slug, workspaceSlug),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);

  if (!workspace) {
    return null;
  }

  return buildWorkspaceDeletionPreflight({
    userId,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    ownerUserId: workspace.ownerUserId,
    memberRole: workspace.memberRole,
    scheduledDeletionAt: workspace.scheduledDeletionAt,
    deletedAt: workspace.deletedAt,
  });
}

async function buildWorkspaceDeletionPreflight({
  userId,
  workspaceId,
  workspaceName,
  workspaceSlug,
  ownerUserId,
  memberRole,
  scheduledDeletionAt,
  deletedAt,
}: {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  ownerUserId: string;
  memberRole: string;
  scheduledDeletionAt: Date | null;
  deletedAt: Date | null;
}): Promise<WorkspaceDeletionPreflight> {
  const [subscription, businessCountRows, activeBusinessCountRows, memberCountRows] =
    await Promise.all([
      getWorkspaceSubscription(workspaceId),
      db
        .select({ count: count() })
        .from(businesses)
        .where(
          and(
            eq(businesses.workspaceId, workspaceId),
            getNonDeletedBusinessCondition(),
          ),
        ),
      db
        .select({ count: count() })
        .from(businesses)
        .where(
          and(
            eq(businesses.workspaceId, workspaceId),
            getBusinessViewCondition("active"),
          ),
        ),
      db
        .select({ count: count() })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId)),
    ]);

  const subscriptionSnapshot = subscription
    ? {
        status: subscription.status,
        canceledAt: subscription.canceledAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        billingProvider: subscription.billingProvider,
        providerSubscriptionId: subscription.providerSubscriptionId,
      }
    : null;
  const blockers = [];

  if (memberRole !== "owner" || ownerUserId !== userId) {
    blockers.push({
      code: "owner_only" as const,
      message: "Only the workspace owner can manage workspace deletion.",
    });
  } else if (requiresWorkspaceSubscriptionCancellation(subscriptionSnapshot)) {
    blockers.push({
      code: "subscription_cancellation_required" as const,
      message:
        "Cancel the workspace subscription first. Deleting a workspace does not cancel billing for you.",
    });
  }

  const state = getWorkspaceDeletionState({
    deletedAt,
    scheduledDeletionAt,
    subscription: subscriptionSnapshot,
  });
  const effectiveDeletionAt = getWorkspaceDeletionEffectiveAt(subscriptionSnapshot);

  return {
    workspaceId,
    workspaceName,
    workspaceSlug,
    state,
    scheduledDeletionAt,
    effectiveDeletionAt,
    canRequestDeletion: blockers.length === 0 && deletedAt === null,
    canCancelScheduledDeletion:
      blockers.length === 0 &&
      scheduledDeletionAt !== null &&
      deletedAt === null &&
      ownerUserId === userId,
    activeBusinessCount: Number(activeBusinessCountRows[0]?.count ?? 0),
    businessCount: Number(businessCountRows[0]?.count ?? 0),
    memberCount: Number(memberCountRows[0]?.count ?? 0),
    subscription: subscriptionSnapshot,
    blockers,
  };
}
