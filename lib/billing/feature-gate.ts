import "server-only";

/**
 * Feature gate: local-only access checks for the Requo billing system.
 *
 * All decisions are made from local DB state (`account_subscriptions`,
 * `payment_attempts`, `refunds`, `businesses`). No external API calls.
 *
 * PHP / Adaptive Currency subscriptions get identical plan access — only
 * `status` and `plan` on the subscription row drive entitlements.
 */

import { and, count, eq, gte, isNull } from "drizzle-orm";

import {
  getAccountSubscription,
  getEffectivePlanForUser,
} from "@/lib/billing/subscription-service";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema/businesses";
import {
  paymentAttempts,
  refunds,
} from "@/lib/db/schema/subscriptions";
import {
  hasFeatureAccess,
  type PlanFeature,
} from "@/lib/plans/entitlements";
import type { BusinessPlan } from "@/lib/plans/plans";
import { getUsageLimit } from "@/lib/plans/usage-limits";

const REFUND_WINDOW_DAYS = 30;
const REFUND_WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Returns the effective plan for a user. Alias for `getEffectivePlanForUser`. */
export async function getCurrentPlan(userId: string): Promise<BusinessPlan> {
  return getEffectivePlanForUser(userId);
}

/** True if the user has an active subscription (status `active` or `past_due`). */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getAccountSubscription(userId);
  if (!subscription) return false;
  return subscription.status === "active" || subscription.status === "past_due";
}

/**
 * True if the user can create another business (count of owned, non-deleted
 * businesses is below the plan's `businessesPerPlan` limit).
 */
export async function canCreateBusiness(userId: string): Promise<boolean> {
  const plan = await getCurrentPlan(userId);
  const limit = getUsageLimit(plan, "businessesPerPlan");

  if (limit === null) return true; // null = unlimited

  const [row] = await db
    .select({ value: count() })
    .from(businesses)
    .where(
      and(eq(businesses.ownerUserId, userId), isNull(businesses.deletedAt)),
    );

  return (row?.value ?? 0) < limit;
}

/** True if the user's effective plan includes the specified feature. */
export async function canUseFeature(
  userId: string,
  featureKey: PlanFeature,
): Promise<boolean> {
  const plan = await getCurrentPlan(userId);
  return hasFeatureAccess(plan, featureKey);
}

/**
 * True if the user has billing history to manage (any `account_subscriptions`
 * row exists, regardless of status).
 */
export async function canAccessBillingFeature(
  userId: string,
): Promise<boolean> {
  const subscription = await getAccountSubscription(userId);
  return subscription !== null;
}

/**
 * True if the user has a recent succeeded payment within the refund window
 * (30 days) that has no pending or approved refund.
 */
export async function canRequestRefund(userId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - REFUND_WINDOW_MS);

  const succeededPayments = await db
    .select({ providerPaymentId: paymentAttempts.providerPaymentId })
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.userId, userId),
        eq(paymentAttempts.status, "succeeded"),
        gte(paymentAttempts.createdAt, cutoff),
      ),
    );

  if (succeededPayments.length === 0) return false;

  const providerPaymentIds = succeededPayments
    .map((row) => row.providerPaymentId)
    .filter((value): value is string => Boolean(value));

  if (providerPaymentIds.length === 0) return false;

  const blockingRefunds = await db
    .select({
      providerPaymentId: refunds.providerPaymentId,
      status: refunds.status,
    })
    .from(refunds)
    .where(eq(refunds.userId, userId));

  const blockedSet = new Set(
    blockingRefunds
      .filter((r) => r.status === "pending" || r.status === "approved")
      .map((r) => r.providerPaymentId),
  );

  return providerPaymentIds.some((id) => !blockedSet.has(id));
}
