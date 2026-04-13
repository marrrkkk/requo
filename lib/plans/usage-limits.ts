/**
 * Central usage-limit definitions for the Requo pricing system.
 *
 * Limits are defined per plan. A `null` limit means unlimited.
 * Usage enforcement uses the helpers in `./usage.ts`.
 */

import type { BusinessPlan } from "@/lib/plans/plans";

export const usageLimitKeys = [
  "inquiriesPerMonth",
  "quotesPerMonth",
] as const;

export type UsageLimitKey = (typeof usageLimitKeys)[number];

type PlanUsageLimits = Record<UsageLimitKey, number | null>;

const planUsageLimits: Record<BusinessPlan, PlanUsageLimits> = {
  free: {
    inquiriesPerMonth: 100,
    quotesPerMonth: 50,
  },
  pro: {
    inquiriesPerMonth: null,
    quotesPerMonth: null,
  },
  business: {
    inquiriesPerMonth: null,
    quotesPerMonth: null,
  },
};

/**
 * Returns the usage limit for a plan and key, or `null` if unlimited.
 */
export function getUsageLimit(
  plan: BusinessPlan,
  key: UsageLimitKey,
): number | null {
  return planUsageLimits[plan][key];
}

/**
 * Returns `true` if the plan has a finite limit for the given key.
 */
export function isUsageLimited(
  plan: BusinessPlan,
  key: UsageLimitKey,
): boolean {
  return planUsageLimits[plan][key] !== null;
}

/** Human-readable labels for usage limit keys. */
export const usageLimitLabels: Record<UsageLimitKey, string> = {
  inquiriesPerMonth: "Inquiries per month",
  quotesPerMonth: "Quotes per month",
};
