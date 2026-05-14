/**
 * Shared paywall utility helpers.
 *
 * Pure functions usable by both client and server components.
 * The fail-closed wrapper ensures entitlement checks default to denied
 * on service errors (Requirement 7.8).
 */

import type { BusinessPlan } from "@/lib/plans/plans";
import { planMeta } from "@/lib/plans/plans";
import {
  hasFeatureAccess,
  getRequiredPlan,
  planFeatureDescriptions,
  planFeatureLabels,
  type PlanFeature,
} from "@/lib/plans/entitlements";

/**
 * Returns the human-readable benefit description for a feature.
 * Used in upgrade prompts and locked-action popovers to communicate
 * what the user gains by upgrading.
 */
export function getUpgradeDescription(feature: PlanFeature): string {
  return planFeatureDescriptions[feature];
}

/**
 * Returns the human-readable label for a feature.
 */
export function getFeatureLabel(feature: PlanFeature): string {
  return planFeatureLabels[feature];
}

/**
 * Resolves the minimum plan required to unlock a feature.
 * Returns the plan identifier or defaults to "pro" if the feature
 * is somehow not mapped (defensive fallback).
 */
export function resolveRequiredPlan(feature: PlanFeature): BusinessPlan {
  const required = getRequiredPlan(feature);
  // If null, the feature is available on all plans (including free).
  // In a paywall context this shouldn't happen, but default to "pro" defensively.
  return required ?? "pro";
}

/**
 * Returns the display label for the required plan (e.g., "Pro", "Business").
 */
export function getRequiredPlanLabel(feature: PlanFeature): string {
  const plan = resolveRequiredPlan(feature);
  return planMeta[plan].label;
}

/**
 * Returns the CTA text for upgrading from the current plan.
 * - free → "Upgrade to Pro"
 * - pro → "Upgrade to Business"
 * - business → null (no upgrade available)
 */
export function getUpgradeCtaText(
  currentPlan: BusinessPlan,
): string | null {
  switch (currentPlan) {
    case "free":
      return "Upgrade to Pro";
    case "pro":
      return "Upgrade to Business";
    case "business":
      return null;
  }
}

/**
 * Fail-closed wrapper for entitlement checks.
 *
 * Wraps `hasFeatureAccess()` in a try/catch so that any service error
 * (unexpected exception, corrupted state, etc.) results in access being
 * denied rather than granted. This satisfies Requirement 7.8.
 *
 * Use this in place of raw `hasFeatureAccess()` when the call site cannot
 * tolerate an unhandled exception bubbling up (e.g., inside render logic
 * where a thrown error would crash the component tree).
 */
export function safeHasFeatureAccess(
  plan: BusinessPlan,
  feature: PlanFeature,
): boolean {
  try {
    return hasFeatureAccess(plan, feature);
  } catch {
    // Fail closed: deny access on any error
    return false;
  }
}
