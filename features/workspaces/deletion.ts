import type { SubscriptionStatus } from "@/lib/billing/types";

export const workspaceDeletionStates = [
  "active",
  "cancellation_required",
  "scheduled_for_deletion",
  "deleted",
] as const;

export type WorkspaceDeletionState = (typeof workspaceDeletionStates)[number];

export type WorkspaceSubscriptionSnapshot = {
  status: SubscriptionStatus;
  canceledAt: Date | null;
  currentPeriodEnd: Date | null;
  billingProvider: string | null;
  providerSubscriptionId: string | null;
};

export function requiresWorkspaceSubscriptionCancellation(
  subscription: WorkspaceSubscriptionSnapshot | null,
) {
  if (!subscription) {
    return false;
  }

  return (
    (subscription.status === "active" ||
      subscription.status === "past_due" ||
      subscription.status === "pending") &&
    subscription.canceledAt === null
  );
}

export function getWorkspaceDeletionEffectiveAt(
  subscription: WorkspaceSubscriptionSnapshot | null,
  now = new Date(),
) {
  if (!subscription) {
    return null;
  }

  if (requiresWorkspaceSubscriptionCancellation(subscription)) {
    return null;
  }

  if (
    (subscription.status === "active" ||
      subscription.status === "past_due" ||
      subscription.status === "canceled") &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd.getTime() > now.getTime()
  ) {
    return subscription.currentPeriodEnd;
  }

  return null;
}

export function getWorkspaceDeletionState({
  deletedAt,
  scheduledDeletionAt,
  subscription,
  now = new Date(),
}: {
  deletedAt: Date | null;
  scheduledDeletionAt: Date | null;
  subscription: WorkspaceSubscriptionSnapshot | null;
  now?: Date;
}): WorkspaceDeletionState {
  if (deletedAt) {
    return "deleted";
  }

  if (scheduledDeletionAt) {
    return "scheduled_for_deletion";
  }

  if (
    requiresWorkspaceSubscriptionCancellation(subscription) ||
    getWorkspaceDeletionEffectiveAt(subscription, now)
  ) {
    return "cancellation_required";
  }

  return "active";
}
