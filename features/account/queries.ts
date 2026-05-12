import "server-only";

import { and, count, eq, isNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

import type {
  AccountDeletionPreflight,
  AccountProfileRecord,
  AccountSecurityView,
} from "@/features/account/types";
import {
  getUserProfileCacheTags,
  userShellCacheLife,
} from "@/lib/cache/shell-tags";
import { db } from "@/lib/db/client";
import {
  account,
  businesses,
  profiles,
  businessSubscriptions,
} from "@/lib/db/schema";

async function getCachedAccountProfile(
  userId: string,
): Promise<AccountProfileRecord | null> {
  "use cache";

  cacheLife(userShellCacheLife);
  cacheTag(...getUserProfileCacheTags(userId));

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
}

export const getAccountProfileForUser = cache(async (
  userId: string,
): Promise<AccountProfileRecord | null> => {
  return getCachedAccountProfile(userId);
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
      .from(businesses)
      .where(
        and(
          eq(businesses.ownerUserId, userId),
          isNull(businesses.deletedAt),
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
  const [ownedBusinessRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        subscriptionStatus: businessSubscriptions.status,
        canceledAt: businessSubscriptions.canceledAt,
        currentPeriodEnd: businessSubscriptions.currentPeriodEnd,
        billingProvider: businessSubscriptions.billingProvider,
        providerSubscriptionId: businessSubscriptions.providerSubscriptionId,
      })
      .from(businesses)
      .leftJoin(
        businessSubscriptions,
        eq(businessSubscriptions.businessId, businesses.id),
      )
      .where(
        and(
          eq(businesses.ownerUserId, userId),
          isNull(businesses.deletedAt),
        ),
      ),
  ]);

  const blockers = ownedBusinessRows.map((biz) => {
    const hasActiveSubscription =
      biz.subscriptionStatus === "active" ||
      biz.subscriptionStatus === "past_due";

    if (hasActiveSubscription) {
      return {
        code: "owned_business_subscription" as const,
        message: `You can't delete this account yet because ${biz.name} has an active subscription. Cancel it first.`,
        businessName: biz.name,
        businessSlug: biz.slug,
      };
    }

    return {
      code: "owned_business" as const,
      message: `You can't delete this account yet because you still own ${biz.name}. Transfer ownership or delete the business first.`,
      businessName: biz.name,
      businessSlug: biz.slug,
    };
  });

  return {
    allowed: blockers.length === 0,
    blockers,
    ownedBusinesses: ownedBusinessRows.map((biz) => ({
      id: biz.id,
      name: biz.name,
      slug: biz.slug,
    })),
    soleOwnedBusinesses: [],
  };
}
