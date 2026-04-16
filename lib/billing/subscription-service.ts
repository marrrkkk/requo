import "server-only";

/**
 * Core subscription operations. All workspace plan state mutations go
 * through this module so the logic stays centralized.
 *
 * The workspace `plan` column is kept in sync as a denormalized read
 * cache. The authoritative state lives in `workspace_subscriptions`.
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { workspaces } from "@/lib/db/schema/workspaces";
import {
  workspaceSubscriptions,
  type BillingCurrency,
  type BillingProvider,
  type SubscriptionStatus,
} from "@/lib/db/schema/subscriptions";
import type { WorkspacePlan } from "@/lib/plans/plans";

type SubscriptionRow = typeof workspaceSubscriptions.$inferSelect;

/* ── Read ──────────────────────────────────────────────────────────────────── */

/**
 * Returns the subscription row for a workspace, or `null` if no
 * subscription exists (workspace is implicitly free).
 */
export async function getWorkspaceSubscription(
  workspaceId: string,
): Promise<SubscriptionRow | null> {
  const [row] = await db
    .select()
    .from(workspaceSubscriptions)
    .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
    .limit(1);

  return row ?? null;
}

/**
 * Resolves the effective plan from the subscription state.
 * Falls back to the `workspaces.plan` column for backward compatibility
 * with existing free workspaces that don't have a subscription row.
 */
export async function getEffectivePlan(
  workspaceId: string,
): Promise<WorkspacePlan> {
  const subscription = await getWorkspaceSubscription(workspaceId);

  if (!subscription) {
    // No subscription row → read from workspace.plan (backward compat)
    const [ws] = await db
      .select({ plan: workspaces.plan })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    return (ws?.plan as WorkspacePlan) ?? "free";
  }

  return resolveEffectivePlanFromSubscription(subscription);
}

/**
 * Pure function that resolves the effective workspace plan from a
 * subscription row. Exported for unit testing.
 */
export function resolveEffectivePlanFromSubscription(
  subscription: SubscriptionRow,
): WorkspacePlan {
  switch (subscription.status) {
    case "active":
      return subscription.plan as WorkspacePlan;

    case "canceled":
      // Still active until end of billing period
      if (
        subscription.currentPeriodEnd &&
        subscription.currentPeriodEnd > new Date()
      ) {
        return subscription.plan as WorkspacePlan;
      }
      return "free";

    case "past_due":
      // Grace period: keep paid access
      return subscription.plan as WorkspacePlan;

    case "pending":
    case "expired":
    case "incomplete":
    case "free":
    default:
      return "free";
  }
}

/* ── Write ─────────────────────────────────────────────────────────────────── */

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

type ActivateSubscriptionParams = {
  workspaceId: string;
  plan: WorkspacePlan;
  provider: BillingProvider;
  currency: BillingCurrency;
  status?: SubscriptionStatus;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerCheckoutId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
};

/**
 * Creates or updates a workspace subscription to an active state.
 * Also syncs the workspace `plan` column.
 */
export async function activateSubscription(
  params: ActivateSubscriptionParams,
): Promise<SubscriptionRow> {
  const now = new Date();
  const existing = await getWorkspaceSubscription(params.workspaceId);

  let subscription: SubscriptionRow;

  if (existing) {
    const [updated] = await db
      .update(workspaceSubscriptions)
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
        currentPeriodStart: params.currentPeriodStart ?? now,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        canceledAt: null,
        updatedAt: now,
      })
      .where(eq(workspaceSubscriptions.id, existing.id))
      .returning();

    subscription = updated!;
  } else {
    const [created] = await db
      .insert(workspaceSubscriptions)
      .values({
        id: generateId("sub"),
        workspaceId: params.workspaceId,
        status: params.status ?? "active",
        plan: params.plan,
        billingProvider: params.provider,
        billingCurrency: params.currency,
        providerCustomerId: params.providerCustomerId ?? null,
        providerSubscriptionId: params.providerSubscriptionId ?? null,
        providerCheckoutId: params.providerCheckoutId ?? null,
        currentPeriodStart: params.currentPeriodStart ?? now,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    subscription = created!;
  }

  // Sync workspace plan column — only upgrade when status grants access
  const effectiveStatus = params.status ?? "active";
  const planToSync =
    effectiveStatus === "active" || effectiveStatus === "past_due"
      ? params.plan
      : "free";
  await syncWorkspacePlanColumn(params.workspaceId, planToSync);

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
  workspaceId: string,
  status: SubscriptionStatus,
  updates?: {
    providerSubscriptionId?: string | null;
    providerCustomerId?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    canceledAt?: Date | null;
  },
): Promise<SubscriptionRow | null> {
  const existing = await getWorkspaceSubscription(workspaceId);

  if (!existing) {
    return null;
  }

  const [updated] = await db
    .update(workspaceSubscriptions)
    .set({
      status,
      providerSubscriptionId:
        updates?.providerSubscriptionId ?? existing.providerSubscriptionId,
      providerCustomerId:
        updates?.providerCustomerId ?? existing.providerCustomerId,
      currentPeriodStart:
        updates?.currentPeriodStart ?? existing.currentPeriodStart,
      currentPeriodEnd:
        updates?.currentPeriodEnd ?? existing.currentPeriodEnd,
      canceledAt: updates?.canceledAt ?? existing.canceledAt,
      updatedAt: new Date(),
    })
    .where(eq(workspaceSubscriptions.id, existing.id))
    .returning();

  // Sync workspace plan column
  const effectivePlan = resolveEffectivePlanFromSubscription(updated!);
  await syncWorkspacePlanColumn(workspaceId, effectivePlan);

  return updated!;
}

/**
 * Marks a subscription as canceled. The workspace keeps paid access
 * until `currentPeriodEnd`.
 */
export async function cancelSubscription(
  workspaceId: string,
): Promise<SubscriptionRow | null> {
  return updateSubscriptionStatus(workspaceId, "canceled", {
    canceledAt: new Date(),
  });
}

/**
 * Marks a subscription as expired and downgrades the workspace to free.
 */
export async function expireSubscription(
  workspaceId: string,
): Promise<SubscriptionRow | null> {
  const result = await updateSubscriptionStatus(workspaceId, "expired");
  await syncWorkspacePlanColumn(workspaceId, "free");
  return result;
}

/* ── Sync helper ───────────────────────────────────────────────────────────── */

/**
 * Keeps the workspace `plan` column in sync with the subscription state.
 * This column is used as a denormalized read cache by `lib/plans/queries.ts`.
 */
async function syncWorkspacePlanColumn(
  workspaceId: string,
  plan: WorkspacePlan,
): Promise<void> {
  await db
    .update(workspaces)
    .set({ plan, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));
}
