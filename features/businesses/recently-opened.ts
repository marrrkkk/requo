import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { getNonDeletedBusinessCondition } from "@/features/businesses/lifecycle";
import type { BusinessType } from "@/features/inquiries/business-types";
import { db } from "@/lib/db/client";
import {
  businessMembers,
  businesses,
  userRecentBusinesses,
  workspaces,
} from "@/lib/db/schema";

const MAX_RECENT_BUSINESSES = 6;

export type RecentBusiness = {
  slug: string;
  name: string;
  logoStoragePath: string | null;
  defaultCurrency: string;
  workspaceSlug: string;
  workspaceName: string;
  businessType: BusinessType;
  lastOpenedAt: Date;
};

export async function getRecentlyOpenedBusinessesForUser(
  userId: string,
  limit = MAX_RECENT_BUSINESSES,
): Promise<RecentBusiness[]> {
  const rows = await db
    .select({
      slug: businesses.slug,
      name: businesses.name,
      logoStoragePath: businesses.logoStoragePath,
      defaultCurrency: businesses.defaultCurrency,
      workspaceSlug: workspaces.slug,
      workspaceName: workspaces.name,
      businessType: businesses.businessType,
      lastOpenedAt: userRecentBusinesses.lastOpenedAt,
    })
    .from(userRecentBusinesses)
    .innerJoin(
      businesses,
      eq(userRecentBusinesses.businessId, businesses.id),
    )
    .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
    .innerJoin(
      businessMembers,
      and(
        eq(businessMembers.businessId, businesses.id),
        eq(businessMembers.userId, userId),
      ),
    )
    .where(
      and(
        eq(userRecentBusinesses.userId, userId),
        isNull(workspaces.deletedAt),
        getNonDeletedBusinessCondition(),
      ),
    )
    .orderBy(
      desc(userRecentBusinesses.lastOpenedAt),
      asc(businesses.name),
    )
    .limit(limit);

  return rows;
}

export async function recordRecentlyOpenedBusiness({
  businessId,
  openedAt = new Date(),
  userId,
}: {
  businessId: string;
  openedAt?: Date;
  userId: string;
}) {
  await db.transaction(async (tx) => {
    await tx
      .insert(userRecentBusinesses)
      .values({
        userId,
        businessId,
        lastOpenedAt: openedAt,
        createdAt: openedAt,
        updatedAt: openedAt,
      })
      .onConflictDoUpdate({
        target: [
          userRecentBusinesses.userId,
          userRecentBusinesses.businessId,
        ],
        set: {
          lastOpenedAt: openedAt,
          updatedAt: openedAt,
        },
      });

    await tx.execute(sql`
      delete from user_recent_businesses
      where user_id = ${userId}
        and business_id not in (
          select business_id
          from (
            select business_id
            from user_recent_businesses
            where user_id = ${userId}
            order by last_opened_at desc
            limit ${MAX_RECENT_BUSINESSES}
          ) kept_recent_businesses
        )
    `);
  });
}

export function formatRelativeTime(timestamp: Date | number): string {
  const timestampMs =
    timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const seconds = Math.floor((Date.now() - timestampMs) / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);

  return `${weeks}w ago`;
}
