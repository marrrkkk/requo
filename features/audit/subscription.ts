import "server-only";

import type { BillingProvider, SubscriptionStatus } from "@/lib/billing/types";

import { writeAuditLog } from "@/features/audit/mutations";
import type { AuditSource } from "@/features/audit/types";

type SubscriptionAuditSnapshot = {
  plan: string;
  status: SubscriptionStatus;
  billingProvider: BillingProvider;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  providerSubscriptionId: string | null;
};

type WriteSubscriptionTransitionAuditLogsInput = {
  businessId: string;
  previousSubscription: SubscriptionAuditSnapshot | null;
  nextSubscription: SubscriptionAuditSnapshot | null;
  source: AuditSource;
  providerEventId?: string;
};

function buildCommonMetadata(
  subscription: SubscriptionAuditSnapshot | null,
  providerEventId?: string,
) {
  return {
    plan: subscription?.plan ?? null,
    provider: subscription?.billingProvider ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    providerSubscriptionId: subscription?.providerSubscriptionId ?? null,
    providerEventId: providerEventId ?? null,
  };
}

function shouldLogCheckoutSucceeded(
  previousSubscription: SubscriptionAuditSnapshot | null,
  nextSubscription: SubscriptionAuditSnapshot | null,
) {
  if (!nextSubscription) {
    return false;
  }

  if (!["active", "past_due"].includes(nextSubscription.status)) {
    return false;
  }

  return (
    !previousSubscription ||
    ["pending", "incomplete", "expired", "free"].includes(
      previousSubscription.status,
    )
  );
}

function shouldLogReactivated(
  previousSubscription: SubscriptionAuditSnapshot | null,
  nextSubscription: SubscriptionAuditSnapshot | null,
) {
  if (!previousSubscription || !nextSubscription) {
    return false;
  }

  if (!["active", "past_due"].includes(nextSubscription.status)) {
    return false;
  }

  return ["canceled", "expired"].includes(previousSubscription.status);
}

export async function writeSubscriptionTransitionAuditLogs({
  businessId,
  previousSubscription,
  nextSubscription,
  source,
  providerEventId,
}: WriteSubscriptionTransitionAuditLogsInput) {
  const { db } = await import("@/lib/db/client");

  if (shouldLogCheckoutSucceeded(previousSubscription, nextSubscription)) {
    await writeAuditLog(db, {
      businessId,
      entityType: "subscription",
      action: "subscription.checkout_succeeded",
      metadata: buildCommonMetadata(nextSubscription, providerEventId),
      source,
    });
  }

  if (shouldLogReactivated(previousSubscription, nextSubscription)) {
    await writeAuditLog(db, {
      businessId,
      entityType: "subscription",
      action: "subscription.reactivated",
      metadata: buildCommonMetadata(nextSubscription, providerEventId),
      source,
    });
  }

  if (
    previousSubscription &&
    nextSubscription &&
    previousSubscription.plan !== nextSubscription.plan
  ) {
    await writeAuditLog(db, {
      businessId,
      entityType: "subscription",
      action: "subscription.plan_changed",
      metadata: {
        ...buildCommonMetadata(nextSubscription, providerEventId),
        previousPlan: previousSubscription.plan,
        nextPlan: nextSubscription.plan,
      },
      source,
    });
  }

  if (
    previousSubscription &&
    nextSubscription &&
    previousSubscription.status !== "canceled" &&
    nextSubscription.status === "canceled"
  ) {
    await writeAuditLog(db, {
      businessId,
      entityType: "subscription",
      action: "subscription.canceled",
      metadata: buildCommonMetadata(nextSubscription, providerEventId),
      source,
    });
  }
}
