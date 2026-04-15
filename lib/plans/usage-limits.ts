/**
 * Central usage-limit definitions for the Requo pricing system.
 *
 * Limits are defined per workspace plan. A `null` limit means unlimited.
 * Usage enforcement uses the helpers in `./usage.ts`.
 *
 * Usage is counted at the workspace level — aggregated across all businesses
 * in the workspace.
 */

import type { WorkspacePlan } from "@/lib/plans/plans";

export const usageLimitKeys = [
  "inquiriesPerMonth",
  "quotesPerMonth",
  "businessesPerWorkspace",
  "membersPerWorkspace",
  "liveFormsPerWorkspace",
  "memoriesPerBusiness",
] as const;

export type UsageLimitKey = (typeof usageLimitKeys)[number];

type PlanUsageLimits = Record<UsageLimitKey, number | null>;

const planUsageLimits: Record<WorkspacePlan, PlanUsageLimits> = {
  free: {
    inquiriesPerMonth: 100,
    quotesPerMonth: 50,
    businessesPerWorkspace: 1,
    membersPerWorkspace: 1,
    liveFormsPerWorkspace: 1,
    memoriesPerBusiness: 0,
  },
  pro: {
    inquiriesPerMonth: null,
    quotesPerMonth: null,
    businessesPerWorkspace: 10,
    membersPerWorkspace: 1,
    liveFormsPerWorkspace: null,
    memoriesPerBusiness: 10,
  },
  business: {
    inquiriesPerMonth: null,
    quotesPerMonth: null,
    businessesPerWorkspace: null,
    membersPerWorkspace: 25,
    liveFormsPerWorkspace: null,
    memoriesPerBusiness: 30,
  },
};

/**
 * Returns the usage limit for a plan and key, or `null` if unlimited.
 */
export function getUsageLimit(
  plan: WorkspacePlan,
  key: UsageLimitKey,
): number | null {
  return planUsageLimits[plan][key];
}

/**
 * Returns `true` if the plan has a finite limit for the given key.
 */
export function isUsageLimited(
  plan: WorkspacePlan,
  key: UsageLimitKey,
): boolean {
  return planUsageLimits[plan][key] !== null;
}

/** Human-readable labels for usage limit keys. */
export const usageLimitLabels: Record<UsageLimitKey, string> = {
  inquiriesPerMonth: "Inquiries per month",
  quotesPerMonth: "Quotes per month",
  businessesPerWorkspace: "Businesses per workspace",
  membersPerWorkspace: "Members per workspace",
  liveFormsPerWorkspace: "Live inquiry forms",
  memoriesPerBusiness: "Knowledge items per business",
};
