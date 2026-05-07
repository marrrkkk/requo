import "server-only";

/**
 * Lightweight plan lookup helpers for contexts that don't have
 * BusinessContext (e.g., public inquiry submission where the business
 * is resolved from slug).
 *
 * Plans now live on businesses.
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

/**
 * Returns the business plan for a business by its ID, or `"free"` if not found.
 */
export async function getplanByBusinessId(
  businessId: string,
): Promise<{ plan: plan; businessId: string }> {
  const [row] = await db
    .select({
      plan: businesses.plan,
      businessId: businesses.id,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return {
    plan: (row?.plan as plan) ?? "free",
    businessId: row?.businessId ?? "",
  };
}

/**
 * Returns the plan for a business by ID.
 *
 * Derives the effective plan from `business_subscriptions` when a
 * subscription exists, falling back to `businesses.plan` for backward
 * compatibility with existing free businesses.
 */
export async function getplanById(
  businessId: string,
): Promise<plan> {
  const { getEffectivePlan } = await import(
    "@/lib/billing/subscription-service"
  );
  return getEffectivePlan(businessId);
}

/** @deprecated Use `getplanByBusinessId` instead. */
export async function getBusinessPlanById(
  businessId: string,
): Promise<plan> {
  const result = await getplanByBusinessId(businessId);
  return result.plan;
}
