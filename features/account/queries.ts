import "server-only";

import { and, count, eq } from "drizzle-orm";
import { cache } from "react";

import type {
  AccountProfileRecord,
  AccountSecurityView,
} from "@/features/account/types";
import { db } from "@/lib/db/client";
import { account, businessMembers, profiles } from "@/lib/db/schema";

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
): Promise<Omit<AccountSecurityView, "activeSessionCount">> => {
  const [accountRows, ownedBusinessRows] = await Promise.all([
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
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.role, "owner"),
        ),
      ),
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
  };
});
