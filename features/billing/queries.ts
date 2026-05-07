import "server-only";

import { desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema/businesses";
import { paymentAttempts } from "@/lib/db/schema/subscriptions";
import {
  getAccountSubscription,
  resolveEffectivePlanFromSubscription,
} from "@/lib/billing/subscription-service";
import { getBillingRegion, getDefaultCurrency } from "@/lib/billing/region";
import {
  getBusinessBillingCacheTags,
  getUserBillingCacheTags,
  billingShellCacheLife,
} from "@/lib/cache/shell-tags";
import type { AccountBillingOverview } from "@/features/billing/types";
import type { BusinessPlan } from "@/lib/plans/plans";
import type { BillingRegion } from "@/lib/billing/types";

/**
 * Cached business identity (no dynamic APIs like headers()).
 */
async function getCachedBusinessData(businessId: string) {
  "use cache";

  cacheLife(billingShellCacheLife);
  cacheTag(...getBusinessBillingCacheTags(businessId));

  const rows = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      plan: businesses.plan,
      ownerUserId: businesses.ownerUserId,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Returns a full billing overview for the account billing UI.
 * The subscription is resolved from the business owner's account.
 */
export async function getAccountBillingOverview(
  businessId: string,
): Promise<AccountBillingOverview | null> {
  try {
    const [businessData, requestHeaders] = await Promise.all([
      getCachedBusinessData(businessId),
      headers(),
    ]);

    if (!businessData) {
      return null;
    }

    const subscription = await getAccountSubscription(businessData.ownerUserId);
    const region = getBillingRegion(requestHeaders);
    const defaultCurrency = getDefaultCurrency(region);
    const currentPlan = subscription
      ? resolveEffectivePlanFromSubscription(subscription)
      : (businessData.plan as BusinessPlan);

    return {
      userId: businessData.ownerUserId,
      businessId: businessData.id,
      businessName: businessData.name,
      businessSlug: businessData.slug,
      currentPlan,
      region,
      defaultCurrency,
      subscription: subscription
        ? {
            status: subscription.status,
            plan: subscription.plan,
            provider: subscription.billingProvider,
            currency: subscription.billingCurrency,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            canceledAt: subscription.canceledAt,
            providerSubscriptionId: subscription.providerSubscriptionId,
          }
        : null,
    };
  } catch (error) {
    console.error(
      "Failed to load account billing overview.",
      { businessId },
      error,
    );

    return null;
  }
}

/** @deprecated Use `getAccountBillingOverview` instead. */
export const getBusinessBillingOverview = getAccountBillingOverview;

/**
 * Returns payment history for a user account.
 */
export async function getAccountPaymentHistory(
  userId: string,
  limit = 10,
) {
  return db
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.userId, userId))
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(limit);
}

/** @deprecated Use `getAccountPaymentHistory` instead. */
export async function getBusinessPaymentHistory(
  businessId: string,
  limit = 10,
) {
  return db
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.businessId, businessId))
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(limit);
}

/**
 * Detects the billing region for the current request.
 */
export async function detectBillingRegion(): Promise<BillingRegion> {
  const requestHeaders = await headers();
  return getBillingRegion(requestHeaders);
}
