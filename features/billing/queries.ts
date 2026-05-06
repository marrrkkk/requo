import "server-only";

import { desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/lib/db/client";
import { workspaces } from "@/lib/db/schema/workspaces";
import { paymentAttempts } from "@/lib/db/schema/subscriptions";
import {
  getWorkspaceSubscription,
  resolveEffectivePlanFromSubscription,
} from "@/lib/billing/subscription-service";
import { getBillingRegion, getDefaultCurrency } from "@/lib/billing/region";
import {
  getWorkspaceBillingCacheTags,
  billingShellCacheLife,
} from "@/lib/cache/shell-tags";
import type { WorkspaceBillingOverview } from "@/features/billing/types";
import type { WorkspacePlan } from "@/lib/plans/plans";
import type { BillingRegion } from "@/lib/billing/types";

/**
 * Cached workspace identity and fallback plan (no dynamic APIs like headers()).
 *
 * Subscription status is intentionally read outside this cache so checkout and
 * billing screens reflect provider webhook updates even if the denormalized
 * workspace plan or a shell cache entry lags behind the authoritative
 * subscription row.
 */
async function getCachedWorkspaceBillingData(workspaceId: string) {
  "use cache";

  cacheLife(billingShellCacheLife);
  cacheTag(...getWorkspaceBillingCacheTags(workspaceId));

  const workspaceRows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const workspace = workspaceRows[0];

  if (!workspace) {
    return null;
  }

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    fallbackPlan: workspace.plan as WorkspacePlan,
  };
}

/**
 * Returns a full billing overview for the workspace billing UI.
 */
export async function getWorkspaceBillingOverview(
  workspaceId: string,
): Promise<WorkspaceBillingOverview | null> {
  try {
    const [billingData, subscription, requestHeaders] = await Promise.all([
      getCachedWorkspaceBillingData(workspaceId),
      getWorkspaceSubscription(workspaceId),
      headers(),
    ]);

    if (!billingData) {
      return null;
    }

    const region = getBillingRegion(requestHeaders);
    const defaultCurrency = getDefaultCurrency(region);
    const { fallbackPlan, ...workspaceBillingData } = billingData;
    const currentPlan = subscription
      ? resolveEffectivePlanFromSubscription(subscription)
      : fallbackPlan;

    return {
      ...workspaceBillingData,
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
      "Failed to load workspace billing overview.",
      { workspaceId },
      error,
    );

    return null;
  }
}

/**
 * Returns payment history for a workspace.
 */
export async function getWorkspacePaymentHistory(
  workspaceId: string,
  limit = 10,
) {
  return db
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.workspaceId, workspaceId))
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
