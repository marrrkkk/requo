import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessMembers } from "@/lib/db/schema";

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
