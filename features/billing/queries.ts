import "server-only";

import { desc, eq, and, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

import { db } from "@/lib/db/client";
import { listLockCandidatesForDowngrade } from "@/features/businesses/plan-enforcement";
import { businesses } from "@/lib/db/schema/businesses";
import { paymentAttempts } from "@/lib/db/schema/subscriptions";
import {
  getCachedAccountSubscription,
  getAccountSubscription,
  resolveEffectivePlanFromSubscription,
} from "@/lib/billing/subscription-service";
import {
  getBusinessBillingCacheTags,
  billingShellCacheLife,
} from "@/lib/cache/shell-tags";
import type { AccountBillingOverview } from "@/features/billing/types";
import type { BusinessPlan } from "@/lib/plans/plans";

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

function toBillingSubscriptionView(
  subscription: Awaited<ReturnType<typeof getAccountSubscription>>,
): AccountBillingOverview["subscription"] {
  return subscription
    ? {
        status: subscription.status,
        plan: subscription.plan,
        provider: subscription.billingProvider,
        currency: subscription.billingCurrency,
        paymentMethod: subscription.paymentMethod,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        canceledAt: subscription.canceledAt,
        providerSubscriptionId: subscription.providerSubscriptionId,
        providerCustomerId: subscription.providerCustomerId,
      }
    : null;
}

function createEmptyDowngradePreview(): AccountBillingOverview["downgradePreview"] {
  return {
    targetPlan: "free",
    activeBusinessLimit: null,
    activeBusinesses: [],
    requiresSelection: false,
  };
}

/**
 * Slim shell billing state for dashboard chrome and upgrade buttons.
 * It intentionally skips downgrade preview queries used only by billing pages.
 *
 * Wrapped in `React.cache` so the business shell and the streamed upgrade
 * slot (which both call this from the same layout) share one resolution per
 * request. The inner cached reads are already `"use cache"`-backed.
 */
export const getBusinessBillingShellOverview = cache(
  async (businessId: string): Promise<AccountBillingOverview | null> => {
    try {
      const businessData = await getCachedBusinessData(businessId);

      if (!businessData) {
        return null;
      }

      const subscription = await getCachedAccountSubscription(
        businessData.ownerUserId,
      );
      const currentPlan = subscription
        ? resolveEffectivePlanFromSubscription(subscription)
        : (businessData.plan as BusinessPlan);

      return {
        userId: businessData.ownerUserId,
        businessId: businessData.id,
        businessName: businessData.name,
        businessSlug: businessData.slug,
        currentPlan,
        downgradePreview: createEmptyDowngradePreview(),
        subscription: toBillingSubscriptionView(subscription),
      };
    } catch (error) {
      console.error(
        "Failed to load shell billing overview.",
        { businessId },
        error,
      );

      return null;
    }
  },
);

/**
 * Returns a full billing overview for the account billing UI.
 * The subscription is resolved from the business owner's account.
 */
export async function getAccountBillingOverview(
  businessId: string,
): Promise<AccountBillingOverview | null> {
  try {
    const businessData = await getCachedBusinessData(businessId);

    if (!businessData) {
      return null;
    }

    const subscription = await getAccountSubscription(businessData.ownerUserId);
    const downgradePreview = await listLockCandidatesForDowngrade({
      ownerUserId: businessData.ownerUserId,
      targetPlan: "free",
    });
    const currentPlan = subscription
      ? resolveEffectivePlanFromSubscription(subscription)
      : (businessData.plan as BusinessPlan);

    return {
      userId: businessData.ownerUserId,
      businessId: businessData.id,
      businessName: businessData.name,
      businessSlug: businessData.slug,
      currentPlan,
      downgradePreview: {
        targetPlan: "free",
        activeBusinessLimit: downgradePreview.activeBusinessLimit,
        activeBusinesses: downgradePreview.activeBusinesses.map((business) => ({
          id: business.id,
          name: business.name,
          slug: business.slug,
          lastOpenedAt: business.lastOpenedAt,
        })),
        requiresSelection: downgradePreview.requiresSelection,
      },
      subscription: toBillingSubscriptionView(subscription),
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
    .where(
      and(
        eq(paymentAttempts.userId, userId),
        inArray(paymentAttempts.status, ["succeeded", "failed"]),
      ),
    )
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(limit);
}

/** @deprecated Use `getAccountPaymentHistory` instead. */
export async function getBusinessPaymentHistory(
  businessId: string,
  limit = 10,
) {
  const rows = await db
    .select({ ownerUserId: businesses.ownerUserId })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const ownerUserId = rows[0]?.ownerUserId;
  if (!ownerUserId) {
    return [];
  }

  return getAccountPaymentHistory(ownerUserId, limit);
}
