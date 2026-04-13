import "server-only";

/**
 * Lightweight plan lookup for contexts that don't have BusinessContext
 * (e.g., public inquiry submission where the business is resolved from slug).
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import type { BusinessPlan } from "@/lib/plans/plans";

/**
 * Returns the plan for a business by ID, or `"free"` if not found.
 * This is intentionally lightweight — just one column.
 */
export async function getBusinessPlanById(
  businessId: string,
): Promise<BusinessPlan> {
  const [row] = await db
    .select({ plan: businesses.plan })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return (row?.plan as BusinessPlan) ?? "free";
}
