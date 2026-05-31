import "server-only";

/**
 * Feature gate: local-only access checks for the Requo billing system.
 *
 * All decisions are made from local DB state (`business_subscriptions`,
 * `payment_attempts`, `refunds`, `businesses`). No external API calls.
 *
 * PHP / Adaptive Currency subscriptions get identical plan access — only
 * `status` and `plan` on the subscription row drive entitlements.
 */

import { and, count, eq, gte, isNull, sql } from "drizzle-orm";

import {
  getBusinessSubscription,
  getEffectivePlanForBusiness,
} from "@/lib/billing/subscription-service";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema/businesses";
import {
  paymentAttempts,
  businessSubscriptions,
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

/** Returns the effective plan for a business. Alias for `getEffectivePlanForBusiness`. */
export async function getCurrentPlan(businessId: string): Promise<BusinessPlan> {
  return getEffectivePlanForBusiness(businessId);
}

/** True if the business has an active subscription (status `active` or `past_due`). */
export async function hasActiveSubscription(businessId: string): Promise<boolean> {
  const subscription = await getBusinessSubscription(businessId);
  if (!subscription) return false;
  return subscription.status === "active" || subscription.status === "past_due";
}

/**
 * True if the user can create another business.
 *
 * In business-scoped billing, plans apply per business (pay-per-business), so
 * we avoid a global “businesses per plan” cap. To prevent free-tier abuse,
 * we cap owners to the free plan's `businessesPerWorkspace` limit until they
 * have at least one active paid subscription on any business.
 */
export async function canCreateBusiness(userId: string): Promise<boolean> {
  const limit = getUsageLimit("free", "businessesPerWorkspace") ?? 2;

  const totalOwnedActive = await db
    .select({ value: count(businesses.id) })
    .from(businesses)
    .where(
      and(
        eq(businesses.ownerUserId, userId),
        isNull(businesses.deletedAt),
        isNull(businesses.archivedAt),
        isNull(businesses.lockedAt),
      ),
    );

  const totalActive = Number(totalOwnedActive[0]?.value ?? 0);

  const paidOwnedCount = await db
    .select({ value: count(businesses.id) })
    .from(businesses)
    .leftJoin(
      businessSubscriptions,
      eq(businessSubscriptions.businessId, businesses.id),
    )
    .where(
      and(
        eq(businesses.ownerUserId, userId),
        isNull(businesses.deletedAt),
        isNull(businesses.archivedAt),
        isNull(businesses.lockedAt),
        // Paid-enough states
        // - active / past_due
        // - canceled but still within current period
        sql`(${businessSubscriptions.status} in ('active','past_due')
          or (
            ${businessSubscriptions.status} = 'canceled'
            and ${businessSubscriptions.currentPeriodEnd} > now()
          ))`,
      ),
    );

  const paidCount = Number(paidOwnedCount[0]?.value ?? 0);
  const freeCount = Math.max(0, totalActive - paidCount);

  return freeCount < limit;
}

/** True if the user's effective plan includes the specified feature. */
export async function canUseFeature(
  businessId: string,
  featureKey: PlanFeature,
): Promise<boolean> {
  const plan = await getCurrentPlan(businessId);
  return hasFeatureAccess(plan, featureKey);
}

/**
 * True if the user has billing history to manage (any `account_subscriptions`
 * row exists, regardless of status).
 */
export async function canAccessBillingFeature(
  businessId: string,
): Promise<boolean> {
  const subscription = await getBusinessSubscription(businessId);
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
