import "server-only";

import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { cache } from "react";

import type {
  AccountDeletionPreflight,
  AccountProfileRecord,
  AccountSecurityView,
} from "@/features/account/types";
import {
  getWorkspaceDeletionEffectiveAt,
  requiresWorkspaceSubscriptionCancellation,
} from "@/features/workspaces/deletion";
import { db } from "@/lib/db/client";
import {
  account,
  businesses,
  businessMembers,
  profiles,
  workspaceSubscriptions,
  workspaces,
} from "@/lib/db/schema";

export const getAccountProfileForUser = cache(async (
  userId: string,
): Promise<AccountProfileRecord | null> => {
  const [profile] = await db
    .select({
      fullName: profiles.fullName,
      jobTitle: profiles.jobTitle,
      phone: profiles.phone,
      avatarStoragePath: profiles.avatarStoragePath,
      avatarContentType: profiles.avatarContentType,
      onboardingCompletedAt: profiles.onboardingCompletedAt,
      dashboardTourCompletedAt: profiles.dashboardTourCompletedAt,
      formEditorTourCompletedAt: profiles.formEditorTourCompletedAt,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return profile ?? null;
});

export const getAccountSecurityForUser = cache(async (
  userId: string,
  email: string,
): Promise<Omit<AccountSecurityView, "activeSessionCount" | "activeSessions">> => {
  const [accountRows, ownedBusinessRows, deletion] = await Promise.all([
    db
      .select({
        providerId: account.providerId,
        password: account.password,
      })
      .from(account)
      .where(eq(account.userId, userId)),
    db
      .select({
        count: count(),
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
      .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.role, "owner"),
          isNull(businesses.deletedAt),
          isNull(workspaces.deletedAt),
        ),
      ),
    getAccountDeletionPreflight(userId),
  ]);

  return {
    email,
    hasPassword: accountRows.some(
      (row) => row.providerId === "credential" && Boolean(row.password),
    ),
    connectedProviders: Array.from(
      new Set(accountRows.map((row) => row.providerId)),
    ),
    ownedBusinessCount: ownedBusinessRows[0]?.count ?? 0,
    deletion,
  };
});

export async function getAccountDeletionPreflight(
  userId: string,
): Promise<AccountDeletionPreflight> {
  const [ownedWorkspaceRows, ownedBusinessRows] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        subscriptionStatus: workspaceSubscriptions.status,
        canceledAt: workspaceSubscriptions.canceledAt,
        currentPeriodEnd: workspaceSubscriptions.currentPeriodEnd,
        billingProvider: workspaceSubscriptions.billingProvider,
        providerSubscriptionId: workspaceSubscriptions.providerSubscriptionId,
      })
      .from(workspaces)
      .leftJoin(
        workspaceSubscriptions,
        eq(workspaceSubscriptions.workspaceId, workspaces.id),
      )
      .where(
        and(
          eq(workspaces.ownerUserId, userId),
          isNull(workspaces.deletedAt),
        ),
      ),
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
      .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.role, "owner"),
          isNull(businesses.deletedAt),
          isNull(workspaces.deletedAt),
        ),
      ),
  ]);

  const ownedWorkspaceIds = new Set(
    ownedWorkspaceRows.map((workspace) => workspace.id),
  );
  const ownedBusinessIds = ownedBusinessRows.map((business) => business.id);
  const ownerCountRows = ownedBusinessIds.length
    ? await db
        .select({
          businessId: businessMembers.businessId,
          count: count(),
        })
        .from(businessMembers)
        .where(
          and(
            inArray(businessMembers.businessId, ownedBusinessIds),
            eq(businessMembers.role, "owner"),
          ),
        )
        .groupBy(businessMembers.businessId)
    : [];

  const ownerCountByBusinessId = new Map(
    ownerCountRows.map((row) => [row.businessId, Number(row.count)]),
  );

  const soleOwnedBusinesses = ownedBusinessRows
    .filter(
      (business) =>
        !ownedWorkspaceIds.has(business.workspaceId) &&
        ownerCountByBusinessId.get(business.id) === 1,
    )
    .map((business) => ({
      id: business.id,
      name: business.name,
      slug: business.slug,
      workspaceName: business.workspaceName,
      workspaceSlug: business.workspaceSlug,
    }));

  const blockers = [
    ...ownedWorkspaceRows.map((workspace) => {
      const subscription = workspace.subscriptionStatus
        ? {
            status: workspace.subscriptionStatus,
            canceledAt: workspace.canceledAt,
            currentPeriodEnd: workspace.currentPeriodEnd,
            billingProvider: workspace.billingProvider,
            providerSubscriptionId: workspace.providerSubscriptionId,
          }
        : null;
      const needsBillingResolution =
        requiresWorkspaceSubscriptionCancellation(subscription) ||
        getWorkspaceDeletionEffectiveAt(subscription) !== null;

      if (needsBillingResolution) {
        return {
          code: "owned_workspace_subscription" as const,
          message: `You can't delete this account yet because you still own ${workspace.name} and its subscription still needs to be resolved first.`,
          workspaceName: workspace.name,
          workspaceSlug: workspace.slug,
        };
      }

      return {
        code: "owned_workspace" as const,
        message: `You can't delete this account yet because you still own ${workspace.name}. Transfer ownership or delete the workspace first.`,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
      };
    }),
    ...soleOwnedBusinesses.map((business) => ({
      code: "sole_business_owner" as const,
      message: `You can't delete this account yet because you are the only owner of ${business.name}. Add another owner or resolve that business first.`,
      workspaceName: business.workspaceName,
      workspaceSlug: business.workspaceSlug,
      businessName: business.name,
      businessSlug: business.slug,
    })),
  ];

  return {
    allowed: blockers.length === 0,
    blockers,
    ownedWorkspaces: ownedWorkspaceRows.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    })),
    soleOwnedBusinesses,
  };
}
