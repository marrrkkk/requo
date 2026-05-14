import "server-only";

/**
 * Server-side access control utility for premium endpoints.
 *
 * Provides a reusable guard function that resolves a user's plan and checks
 * feature entitlements with fail-closed semantics. On any service error,
 * access is denied rather than granted (Requirement 7.8).
 *
 * Use in route handlers and server actions to enforce access control
 * before returning premium data (Requirements 7.6, 7.7).
 */

import { NextResponse } from "next/server";

import { hasFeatureAccess, type PlanFeature } from "@/lib/plans/entitlements";
import type { BusinessPlan } from "@/lib/plans/plans";
import { getEffectivePlanForUser } from "@/lib/billing/subscription-service";

/**
 * Result of a server-side access check.
 *
 * - `authorized`: whether the user has access to the requested feature
 * - `plan`: the resolved plan (defaults to "free" on error)
 * - `error`: internal error context (for logging only, never exposed to client)
 */
export type AccessCheckResult = {
  authorized: boolean;
  plan: BusinessPlan;
  error?: string;
};

/**
 * Checks whether a user has access to a premium feature.
 *
 * Resolves the user's effective plan via `getEffectivePlanForUser()` and
 * checks entitlement via `hasFeatureAccess()`. Both calls are wrapped in
 * try/catch — on any service error, access is denied (fail-closed).
 *
 * Errors are logged with context (userId, feature) but details are never
 * exposed to the client.
 */
export async function checkPremiumAccess(
  userId: string,
  feature: PlanFeature,
): Promise<AccessCheckResult> {
  let plan: BusinessPlan = "free";

  // Step 1: Resolve the user's effective plan
  try {
    plan = await getEffectivePlanForUser(userId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error resolving plan";

    console.error(
      "[paywall/server-access] Failed to resolve plan for user",
      { userId, feature, error: message },
    );

    // Fail-closed: deny access when plan resolution fails
    return { authorized: false, plan: "free", error: message };
  }

  // Step 2: Check feature entitlement
  try {
    const authorized = hasFeatureAccess(plan, feature);
    return { authorized, plan };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error checking entitlement";

    console.error(
      "[paywall/server-access] Failed to check feature access",
      { userId, feature, plan, error: message },
    );

    // Fail-closed: deny access when entitlement check fails
    return { authorized: false, plan, error: message };
  }
}

/**
 * Returns a 403 JSON response for unauthorized premium data requests.
 *
 * Use in route handlers when `checkPremiumAccess` returns `authorized: false`.
 * The response body communicates the denial without exposing internal details.
 */
export function premiumAccessDeniedResponse(feature: PlanFeature): NextResponse {
  return NextResponse.json(
    { error: "Insufficient plan access.", feature },
    { status: 403 },
  );
}
