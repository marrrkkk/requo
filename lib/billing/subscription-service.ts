import "server-only";

/**
 * Core subscription operations for account-level billing.
 *
 * Subscriptions are owned by user accounts, not individual businesses.
 * All businesses owned by a user inherit the account plan.
 *
 * The business `plan` column is kept in sync as a denormalized read cache.
 * The authoritative state lives in `account_subscriptions`.
 */

import { and, eq, isNull } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema/businesses";
import { getBusinessBillingCacheTags, getUserBillingCacheTags } from "@/lib/cache/shell-tags";
import {
  accountSubscriptions,
  type BillingCurrency,
  type BillingProvider,
  type SubscriptionStatus,
} from "@/lib/db/schema/subscriptions";
import type { BusinessPlan } from "@/lib/plans/plans";

type SubscriptionRow = typeof accountSubscriptions.$inferSelect;

/* ── Read ──────────────────────────────────────────────────────────────────── */

/**
 * Returns the subscription row for a user account, or `null` if no
 * subscription exists (user is implicitly free).
 */
export async function getAccountSubscription(
  userId: string,
): Promise<SubscriptionRow | null> {
  const [row] = await db
    .select()
    .from(accountSubscriptions)
    .where(eq(accountSubscriptions.userId, userId))
    .limit(1);

  return row ?? null;
}

/**
 * Resolves the effective plan for a user account.
 * This is the plan that all businesses owned by the user inherit.
 */
export async function getEffectivePlanForUser(
  userId: string,
): Promise<BusinessPlan> {
  const subscription = await getAccountSubscription(userId);

  if (!subscription) {
    return "free";
  }

  return resolveEffectivePlanFromSubscription(subscription);
}

/**
 * Pure function that resolves the effective business plan from a
 * subscription row. Exported for unit testing.
 */
export function resolveEffectivePlanFromSubscription(
  subscription: SubscriptionRow,
): BusinessPlan {
  switch (subscription.status) {
    case "active":
      return subscription.plan as BusinessPlan;

    case "canceled":
      // Still active until end of billing period
      if (
        subscription.currentPeriodEnd &&
        subscription.currentPeriodEnd > new Date()
      ) {
        return subscription.plan as BusinessPlan;
      }
      return "free";

    case "past_due":
      // Grace period: keep paid access
      return subscription.plan as BusinessPlan;

    case "pending":
    case "expired":
    case "incomplete":
    case "free":
    default:
      return "free";
  }
}

/* ── Deprecated adapters ──────────────────────────────────────────────────── */

/**
 * @deprecated Adapter: resolves user from business, then gets account subscription.
 * Use `getAccountSubscription(userId)` directly in new code.
 */
export async function getBusinessSubscription(
  businessId: string,
): Promise<SubscriptionRow | null> {
  const [biz] = await db
    .select({ ownerUserId: businesses.ownerUserId })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) return null;

  return getAccountSubscription(biz.ownerUserId);
}

/** @deprecated Use `getAccountSubscription` instead. */
export const getWorkspaceSubscription = getBusinessSubscription;

/**
 * @deprecated Adapter: resolves user from business, then gets effective plan.
 * Use `getEffectivePlanForUser(userId)` directly in new code.
 */
export async function getEffectivePlan(
  businessId: string,
): Promise<BusinessPlan> {
  const [biz] = await db
    .select({ ownerUserId: businesses.ownerUserId, plan: businesses.plan })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!biz) return "free";

  return getEffectivePlanForUser(biz.ownerUserId);
}

/* ── Write ─────────────────────────────────────────────────────────────────── */

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

type ActivateSubscriptionParams = {
  userId: string;
  plan: BusinessPlan;
  provider: BillingProvider;
  currency: BillingCurrency;
  status?: SubscriptionStatus;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerCheckoutId?: string | null;
  paymentMethod?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
};

/**
 * Creates or updates an account subscription to an active state.
 * Also syncs the `plan` column on ALL businesses owned by the user.
 */
export async function activateSubscription(
  params: ActivateSubscriptionParams,
): Promise<SubscriptionRow> {
  const now = new Date();
  const existing = await getAccountSubscription(params.userId);

  let subscription: SubscriptionRow;

  if (existing) {
    const [updated] = await db
      .update(accountSubscriptions)
      .set({
        status: params.status ?? "active",
        plan: params.plan,
        billingProvider: params.provider,
        billingCurrency: params.currency,
        providerCustomerId: params.providerCustomerId ?? existing.providerCustomerId,
        providerSubscriptionId:
          params.providerSubscriptionId ?? existing.providerSubscriptionId,
        providerCheckoutId:
          params.providerCheckoutId ?? existing.providerCheckoutId,
        paymentMethod: params.paymentMethod ?? existing.paymentMethod,
        currentPeriodStart: params.currentPeriodStart ?? now,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        canceledAt: null,
        updatedAt: now,
      })
      .where(eq(accountSubscriptions.id, existing.id))
      .returning();

    subscription = updated!;
  } else {
    const [created] = await db
      .insert(accountSubscriptions)
      .values({
        id: generateId("sub"),
        userId: params.userId,
        status: params.status ?? "active",
        plan: params.plan,
        billingProvider: params.provider,
        billingCurrency: params.currency,
        providerCustomerId: params.providerCustomerId ?? null,
        providerSubscriptionId: params.providerSubscriptionId ?? null,
        providerCheckoutId: params.providerCheckoutId ?? null,
        paymentMethod: params.paymentMethod ?? null,
        currentPeriodStart: params.currentPeriodStart ?? now,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: accountSubscriptions.userId,
        set: {
          status: params.status ?? "active",
          plan: params.plan,
          billingProvider: params.provider,
          billingCurrency: params.currency,
          providerCustomerId: params.providerCustomerId ?? null,
          providerSubscriptionId: params.providerSubscriptionId ?? null,
          providerCheckoutId: params.providerCheckoutId ?? null,
          paymentMethod: params.paymentMethod ?? null,
          currentPeriodStart: params.currentPeriodStart ?? now,
          currentPeriodEnd: params.currentPeriodEnd ?? null,
          canceledAt: null,
          updatedAt: now,
        },
      })
      .returning();

    subscription = created!;
  }

  // Sync business plan column — only upgrade when status grants access
  const effectiveStatus = params.status ?? "active";
  const planToSync =
    effectiveStatus === "active" || effectiveStatus === "past_due"
      ? params.plan
      : "free";
  await syncOwnerBusinessPlans(params.userId, planToSync);

  return subscription;
}

/**
 * Creates a pending subscription (e.g., QRPh payment awaiting scan).
 */
export async function createPendingSubscription(
  params: Omit<ActivateSubscriptionParams, "status">,
): Promise<SubscriptionRow> {
  return activateSubscription({ ...params, status: "pending" });
}

/**
 * Updates a subscription status from a provider event.
 */
export async function updateSubscriptionStatus(
  userId: string,
  status: SubscriptionStatus,
  updates?: {
    providerSubscriptionId?: string | null;
    providerCustomerId?: string | null;
    paymentMethod?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    canceledAt?: Date | null;
  },
): Promise<SubscriptionRow | null> {
  const existing = await getAccountSubscription(userId);

  if (!existing) {
    return null;
  }

  const [updated] = await db
    .update(accountSubscriptions)
    .set({
      status,
      providerSubscriptionId:
        updates?.providerSubscriptionId ?? existing.providerSubscriptionId,
      providerCustomerId:
        updates?.providerCustomerId ?? existing.providerCustomerId,
      paymentMethod: updates?.paymentMethod ?? existing.paymentMethod,
      currentPeriodStart:
        updates?.currentPeriodStart ?? existing.currentPeriodStart,
      currentPeriodEnd:
        updates?.currentPeriodEnd ?? existing.currentPeriodEnd,
      canceledAt: updates?.canceledAt ?? existing.canceledAt,
      updatedAt: new Date(),
    })
    .where(eq(accountSubscriptions.id, existing.id))
    .returning();

  // Sync business plan column
  const effectivePlan = resolveEffectivePlanFromSubscription(updated!);
  await syncOwnerBusinessPlans(userId, effectivePlan);

  return updated!;
}

/**
 * Updates a subscription's payment method (e.g. from a transaction).
 */
export async function updateSubscriptionPaymentMethod(
  userId: string,
  paymentMethod: string,
): Promise<boolean> {
  const existing = await getAccountSubscription(userId);

  if (!existing) {
    return false;
  }

  const [updated] = await db
    .update(accountSubscriptions)
    .set({
      paymentMethod,
      updatedAt: new Date(),
    })
    .where(eq(accountSubscriptions.id, existing.id))
    .returning({ id: accountSubscriptions.id });

  return !!updated;
}

/**
 * Marks a subscription as canceled. The user keeps paid access
 * until `currentPeriodEnd`.
 */
export async function cancelSubscription(
  userId: string,
): Promise<SubscriptionRow | null> {
  return updateSubscriptionStatus(userId, "canceled", {
    canceledAt: new Date(),
  });
}

/**
 * Marks a subscription as expired and downgrades all businesses to free.
 */
export async function expireSubscription(
  userId: string,
): Promise<SubscriptionRow | null> {
  return updateSubscriptionStatus(userId, "expired");
}

/* ── Sync helper ───────────────────────────────────────────────────────────── */

/**
 * Keeps the `plan` column on ALL businesses owned by the user in sync
 * with the account subscription state. This column is used as a
 * denormalized read cache by `lib/plans/queries.ts`.
 */
async function syncOwnerBusinessPlans(
  userId: string,
  plan: BusinessPlan,
): Promise<void> {
  // Get all active businesses owned by this user
  const ownedBusinesses = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(
      and(
        eq(businesses.ownerUserId, userId),
        isNull(businesses.deletedAt),
      ),
    );

  if (ownedBusinesses.length === 0) return;

  const now = new Date();

  // Bulk update all owned businesses
  await db
    .update(businesses)
    .set({ plan, updatedAt: now })
    .where(
      and(
        eq(businesses.ownerUserId, userId),
        isNull(businesses.deletedAt),
      ),
    );

  // Revalidate cache for user billing and each business
  for (const tag of getUserBillingCacheTags(userId)) {
    revalidateTag(tag, { expire: 0 });
  }

  for (const biz of ownedBusinesses) {
    for (const tag of getBusinessBillingCacheTags(biz.id)) {
      revalidateTag(tag, { expire: 0 });
    }
  }
}
