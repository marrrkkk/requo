import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

import {
  getBusinessChecklistCacheTags,
  hotBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import { businessMembers, inquiries } from "@/lib/db/schema";

export async function getDashboardTourCompletedForMembership(
  membershipId: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      dashboardTourCompletedAt: businessMembers.dashboardTourCompletedAt,
    })
    .from(businessMembers)
    .where(eq(businessMembers.id, membershipId))
    .limit(1);

  return Boolean(row?.dashboardTourCompletedAt);
}

/**
 * Cached inner function for the dashboard tour completion flag.
 * Tagged with business-scoped checklist tags so mutations on the membership
 * (completing the tour) can invalidate via `revalidateTag`.
 *
 * The tour flag changes at most once per membership lifetime, so a generous
 * cache life is appropriate.
 */
async function getCachedDashboardTourCompletedForMembership(
  membershipId: string,
  businessId: string,
): Promise<boolean> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessChecklistCacheTags(businessId));

  const [row] = await db
    .select({
      dashboardTourCompletedAt: businessMembers.dashboardTourCompletedAt,
    })
    .from(businessMembers)
    .where(eq(businessMembers.id, membershipId))
    .limit(1);

  return Boolean(row?.dashboardTourCompletedAt);
}

/**
 * Two-layer cached dashboard tour completion query.
 * - `React.cache()` deduplicates within a single request.
 * - Inner `"use cache"` caches across requests with `hotBusinessCacheLife`.
 *
 * Requires `businessId` in addition to `membershipId` to scope the cache tag
 * correctly via `getBusinessChecklistCacheTags`.
 */
export const getCachedDashboardTourCompleted = cache(
  async (membershipId: string, businessId: string): Promise<boolean> => {
    return getCachedDashboardTourCompletedForMembership(membershipId, businessId);
  },
);

export type ChecklistProgress = {
  hasQualifiedInquiry: boolean;
};

/**
 * Cached inner function for checklist progress.
 * Tagged with business-scoped checklist tags so mutations on inquiries
 * can invalidate via `revalidateTag`.
 */
async function getCachedChecklistProgressForBusiness(
  businessId: string,
): Promise<ChecklistProgress> {
  "use cache";

  cacheLife(hotBusinessCacheLife);
  cacheTag(...getBusinessChecklistCacheTags(businessId));

  const [qualifiedRow] = await Promise.all([
    db
      .select({ id: inquiries.id })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.businessId, businessId),
          sql`${inquiries.qualifiedAt} is not null`,
          isNull(inquiries.deletedAt),
        ),
      )
      .limit(1),
  ]);

  return {
    hasQualifiedInquiry: qualifiedRow.length > 0,
  };
}

/**
 * Two-layer cached checklist progress query.
 * - `React.cache()` deduplicates within a single request (sidebar + next-step banner).
 * - Inner `"use cache"` caches across requests with `hotBusinessCacheLife`.
 */
export const getChecklistProgressForBusiness = cache(
  async (businessId: string): Promise<ChecklistProgress> => {
    return getCachedChecklistProgressForBusiness(businessId);
  },
);
