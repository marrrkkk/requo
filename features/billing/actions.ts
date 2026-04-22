"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/features/audit/mutations";
import { getWorkspaceContextForUser } from "@/lib/db/workspace-access";
import { isPayMongoConfigured, isPaddleConfigured } from "@/lib/env";
import { getProviderForCurrency } from "@/lib/billing/region";
import { createPendingSubscription, getWorkspaceSubscription } from "@/lib/billing/subscription-service";
import { recordPaymentAttempt } from "@/lib/billing/webhook-processor";
import type { CheckoutActionState, CancelActionState, PendingQrPhData } from "@/features/billing/types";
import type { BillingCurrency, BillingInterval, PaidPlan } from "@/lib/billing/types";
import { getWorkspacePath } from "@/features/workspaces/routes";

/**
 * Creates a checkout session for a workspace upgrade.
 * Selects the provider based on the billing currency.
 */
export async function createCheckoutAction(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const user = await requireUser();

  const workspaceId = formData.get("workspaceId");
  const plan = formData.get("plan");
  const currency = formData.get("currency");
  const interval = (formData.get("interval") as BillingInterval) ?? "monthly";

  if (
    typeof workspaceId !== "string" ||
    typeof plan !== "string" ||
    typeof currency !== "string"
  ) {
    return { error: "Invalid input." };
  }

  // Validate plan
  if (plan !== "pro" && plan !== "business") {
    return { error: "Invalid plan selected." };
  }

  // Validate currency
  if (currency !== "PHP" && currency !== "USD") {
    return { error: "Invalid currency." };
  }

  // Verify workspace ownership
  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);

  if (!workspace) {
    return { error: "Workspace not found." };
  }

  if (workspace.memberRole !== "owner") {
    return { error: "Only workspace owners can manage billing." };
  }

  // Check current plan
  if (workspace.plan === plan) {
    return { error: `You're already on the ${plan} plan.` };
  }

  const typedPlan = plan as PaidPlan;
  const typedCurrency = currency as BillingCurrency;
  const typedInterval: BillingInterval = interval === "yearly" ? "yearly" : "monthly";
  const provider = getProviderForCurrency(typedCurrency);

  // Route to correct provider
  if (provider === "paymongo") {
    if (!isPayMongoConfigured) {
      return { error: "QRPh payments are not yet configured. Please try card payment instead." };
    }

    const { createQrPhCheckout } = await import(
      "@/lib/billing/providers/paymongo"
    );

    const result = await createQrPhCheckout({
      plan: typedPlan,
      workspaceId,
      interval: typedInterval,
    });

    if (result.type === "error") {
      return { error: result.message };
    }

    if (result.type === "qrph") {
      // Only create a pending subscription after we have a valid QR code
      await createPendingSubscription({
        workspaceId,
        plan: typedPlan,
        provider: "paymongo",
        currency: "PHP",
      });

      // Record pending payment
      await recordPaymentAttempt({
        workspaceId,
        plan: typedPlan,
        provider: "paymongo",
        providerPaymentId: result.paymentIntentId,
        amount: result.amount,
        currency: "PHP",
        status: "pending",
      });

      return {
        qrData: {
          qrCodeData: result.qrCodeData,
          paymentIntentId: result.paymentIntentId,
          expiresAt: result.expiresAt,
          amount: result.amount,
          currency: "PHP",
        },
      };
    }

    return { error: "Unexpected checkout result." };
  }

  // Paddle
  if (!isPaddleConfigured) {
    return { error: "Card payments are not yet configured. Please try QRPh payment instead." };
  }

  const { createPaddleTransaction } = await import(
    "@/lib/billing/providers/paddle"
  );

  const result = await createPaddleTransaction({
    plan: typedPlan,
    workspaceId,
    userEmail: user.email,
    userName: user.name,
    interval: typedInterval,
  });

  if (result.type === "error") {
    return { error: result.message };
  }

  if (result.type === "redirect") {
    // result.url contains the Paddle transaction ID for overlay checkout
    return { paddleTransactionId: result.url };
  }

  return { error: "Unexpected checkout result." };
}

/**
 * Cancels the current workspace subscription.
 */
export async function cancelSubscriptionAction(
  _prev: CancelActionState,
  formData: FormData,
): Promise<CancelActionState> {
  const user = await requireUser();

  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return { error: "Invalid input." };
  }

  // Verify workspace ownership
  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);

  if (!workspace) {
    return { error: "Workspace not found." };
  }

  if (workspace.memberRole !== "owner") {
    return { error: "Only workspace owners can manage billing." };
  }

  // Get subscription
  const { getWorkspaceSubscription } = await import(
    "@/lib/billing/subscription-service"
  );
  const subscription = await getWorkspaceSubscription(workspaceId);

  if (!subscription || subscription.status === "free") {
    return { error: "No active subscription to cancel." };
  }

  const isPending = subscription.status === "pending";

  // Cancel based on provider
  if (
    subscription.billingProvider === "paddle" &&
    subscription.providerSubscriptionId
  ) {
    const { cancelPaddleSubscription } = await import(
      "@/lib/billing/providers/paddle"
    );
    const success = await cancelPaddleSubscription(
      subscription.providerSubscriptionId,
    );

    if (!success) {
      return { error: "Failed to cancel subscription. Please try again." };
    }

    // Paddle cancels at end of billing period — mark canceledAt but keep status active.
    // The actual status change to "canceled" will come via webhook when the period ends.
    const { updateSubscriptionStatus } = await import(
      "@/lib/billing/subscription-service"
    );
    await updateSubscriptionStatus(workspaceId, "active", {
      canceledAt: new Date(),
    });
    const { db } = await import("@/lib/db/client");

    await writeAuditLog(db, {
      workspaceId,
      actorUserId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      entityType: "subscription",
      action: "subscription.cancellation_requested",
      metadata: {
        plan: subscription.plan,
        provider: subscription.billingProvider,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        providerSubscriptionId: subscription.providerSubscriptionId,
      },
    });

    revalidatePath(getWorkspacePath(workspace.slug));

    return { success: "Subscription canceled. You\u2019ll keep access until the end of your billing period." };
  }

  // For PayMongo (no managed subscription), cancel locally and immediately
  const { cancelSubscription } = await import(
    "@/lib/billing/subscription-service"
  );
  const updatedSubscription = await cancelSubscription(workspaceId);

  if (updatedSubscription) {
    const { db } = await import("@/lib/db/client");
    await writeAuditLog(db, {
      workspaceId,
      actorUserId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      entityType: "subscription",
      action: "subscription.canceled",
      metadata: {
        plan: updatedSubscription.plan,
        provider: updatedSubscription.billingProvider,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd?.toISOString() ?? null,
        providerSubscriptionId: updatedSubscription.providerSubscriptionId,
      },
    });
  }

  revalidatePath(getWorkspacePath(workspace.slug));

  if (isPending) {
    return { success: "Pending payment canceled." };
  }

  return { success: "Subscription canceled. You\u2019ll keep access until the end of your billing period." };
}

/**
 * Retrieves pending QRPh checkout data for a workspace.
 *
 * If the workspace has a pending PayMongo subscription and the payment intent
 * is still valid, returns the QR code data. Otherwise returns null and
 * cleans up expired/failed states.
 */
export async function getPendingQrPhCheckoutAction(
  workspaceId: string,
): Promise<PendingQrPhData | null> {
  const user = await requireUser();

  // Verify workspace ownership
  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);

  if (!workspace || workspace.memberRole !== "owner") {
    return null;
  }

  // Check for pending subscription with PayMongo
  const subscription = await getWorkspaceSubscription(workspaceId);

  if (
    !subscription ||
    subscription.status !== "pending" ||
    subscription.billingProvider !== "paymongo"
  ) {
    return null;
  }

  // Find the most recent pending payment attempt
  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { eq, and, desc } = await import("drizzle-orm");

  const [latestAttempt] = await db
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.workspaceId, workspaceId),
        eq(paymentAttempts.provider, "paymongo"),
        eq(paymentAttempts.status, "pending"),
      ),
    )
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(1);

  if (!latestAttempt) {
    return null;
  }

  // Verify with PayMongo API that the intent is still valid
  const { getPaymentIntentQrData } = await import(
    "@/lib/billing/providers/paymongo"
  );

  const qrData = await getPaymentIntentQrData(latestAttempt.providerPaymentId);

  if (!qrData) {
    // Payment intent expired or failed — clean up
    const { updateSubscriptionStatus } = await import(
      "@/lib/billing/subscription-service"
    );
    const { updatePaymentAttemptStatus } = await import(
      "@/lib/billing/webhook-processor"
    );

    await updatePaymentAttemptStatus(latestAttempt.providerPaymentId, "expired");
    await updateSubscriptionStatus(workspaceId, "expired");

    return null;
  }

  return {
    qrCodeData: qrData.qrCodeData,
    paymentIntentId: qrData.paymentIntentId,
    expiresAt: qrData.expiresAt,
    amount: qrData.amount,
    currency: "PHP",
    plan: subscription.plan,
  };
}

/**
 * Cleans up an expired pending PayMongo subscription.
 *
 * Called automatically from the client when a cached QRPh QR code
 * expires, so the workspace doesn't stay stuck in "pending" status.
 */
export async function cleanupExpiredPendingAction(
  workspaceId: string,
): Promise<void> {
  const user = await requireUser();

  const workspace = await getWorkspaceContextForUser(user.id, workspaceId);
  if (!workspace || workspace.memberRole !== "owner") return;

  const subscription = await getWorkspaceSubscription(workspaceId);
  if (
    !subscription ||
    subscription.status !== "pending" ||
    subscription.billingProvider !== "paymongo"
  ) {
    return;
  }

  const { expireSubscription } = await import(
    "@/lib/billing/subscription-service"
  );
  await expireSubscription(workspaceId);
}
