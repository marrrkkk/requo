import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessAutomations } from "@/lib/db/schema/automations";
import { businesses } from "@/lib/db/schema";
import type { BusinessPlan } from "@/lib/plans/plans";
import { hasFeatureAccess } from "@/lib/plans/entitlements";

// ---------------------------------------------------------------------------
// Automation Limits by Plan (Requirements 5.5, 5.6, 5.7)
// ---------------------------------------------------------------------------

const automationLimits: Record<BusinessPlan, number> = {
  free: 3,
  pro: 20,
  business: 100,
};

/**
 * Returns the maximum number of enabled automation rules allowed for a plan.
 */
export function getAutomationLimit(plan: BusinessPlan): number {
  return automationLimits[plan];
}

/**
 * Checks whether the business can create a new automation based on plan limits.
 * Counts only enabled automations against the cap.
 */
export async function canCreateAutomation(businessId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  plan: BusinessPlan;
}> {
  const [business] = await db
    .select({ plan: businesses.plan })
    .from(businesses)
    .where(eq(businesses.id, businessId));

  if (!business) {
    return { allowed: false, current: 0, limit: 0, plan: "free" };
  }

  const plan = business.plan;
  const limit = getAutomationLimit(plan);

  const [row] = await db
    .select({ value: count(businessAutomations.id) })
    .from(businessAutomations)
    .where(
      and(
        eq(businessAutomations.businessId, businessId),
        eq(businessAutomations.enabled, true),
      ),
    );

  const current = Number(row?.value ?? 0);

  return {
    allowed: current < limit,
    current,
    limit,
    plan,
  };
}

/**
 * Checks whether a plan grants access to the visual workflow builder.
 * Free plans get basic automations but not the workflow builder.
 */
export function canAccessWorkflowBuilder(plan: BusinessPlan): boolean {
  return hasFeatureAccess(plan, "workflowBuilder");
}
