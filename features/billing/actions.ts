"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/features/audit/mutations";
import { getBusinessContextForUser } from "@/lib/db/business-access";
import { isPayMongoConfigured, isPaddleConfigured } from "@/lib/env";
import { getPlanPrice } from "@/lib/billing/plans";
import { getProviderForCurrency } from "@/lib/billing/region";
import {
  createPendingSubscription,
  getAccountSubscription,
  resolveEffectivePlanFromSubscription,
} from "@/lib/billing/subscription-service";
import { recordPaymentAttempt } from "@/lib/billing/webhook-processor";
import type {
  CancelActionState,
  CancelPendingQrCheckoutResult,
  CheckoutStatusSnapshot,
  CheckoutActionState,
  PendingCheckoutState,
  PendingQrPhData,
} from "@/features/billing/types";
import type { BillingCurrency, BillingInterval, PaidPlan } from "@/lib/billing/types";
import { getBusinessPath } from "@/features/businesses/routes";

async function getLatestPendingPaymentAttempt(
  userId: string,
  provider: "paymongo" | "paddle",
) {
  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { and, desc, eq } = await import("drizzle-orm");

  const [latestAttempt] = await db
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.userId, userId),
        eq(paymentAttempts.provider, provider),
        eq(paymentAttempts.status, "pending"),
      ),
    )
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(1);

  return latestAttempt ?? null;
}

async function getLatestPaymentAttemptForCheckout(
  userId: string,
  providerPaymentId: string,
) {
  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { and, desc, eq } = await import("drizzle-orm");

  const [latestAttempt] = await db
    .select({
      providerPaymentId: paymentAttempts.providerPaymentId,
      status: paymentAttempts.status,
    })
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.userId, userId),
        eq(paymentAttempts.providerPaymentId, providerPaymentId),
      ),
    )
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(1);

  return latestAttempt ?? null;
}

async function getPendingPaymongoCheckoutForUser(
  userId: string,
): Promise<PendingCheckoutState | null> {
  const subscription = await getAccountSubscription(userId);

  if (
    !subscription ||
    subscription.status !== "pending" ||
    subscription.billingProvider !== "paymongo"
  ) {
    return null;
  }

  const latestAttempt = await getLatestPendingPaymentAttempt(userId, "paymongo");

  if (!latestAttempt) {
    return null;
  }

  const { getPaymentIntent } = await import(
    "@/lib/billing/providers/paymongo"
  );
  const paymentIntent = await getPaymentIntent(latestAttempt.providerPaymentId);

  if (!paymentIntent) {
    const { updateSubscriptionStatus } = await import(
      "@/lib/billing/subscription-service"
    );
    const { updatePaymentAttemptStatus } = await import(
      "@/lib/billing/webhook-processor"
    );

    await Promise.all([
      updatePaymentAttemptStatus(latestAttempt.providerPaymentId, "expired"),
      updateSubscriptionStatus(userId, "expired"),
    ]);

    return null;
  }

  const paymentIntentStatus = paymentIntent.attributes.status;
  const qrCodeData =
    paymentIntent.attributes.next_action?.redirect?.url ??
    paymentIntent.attributes.next_action?.code?.url ??
    paymentIntent.attributes.next_action?.code?.test_url;

  if (paymentIntentStatus === "awaiting_next_action" && qrCodeData) {
    return {
      amount: paymentIntent.attributes.amount,
      currency: "PHP",
      expiresAt: new Date(
        ((paymentIntent.attributes.created_at ?? Math.floor(Date.now() / 1000)) +
          30 * 60) *
          1000,
      ).toISOString(),
      paymentIntentId: paymentIntent.id,
      plan: subscription.plan as PaidPlan,
      provider: "paymongo",
      qrCodeData,
    };
  }

  if (
    paymentIntentStatus === "processing" ||
    paymentIntentStatus === "succeeded"
  ) {
    return null;
  }

  if (paymentIntentStatus !== "awaiting_payment_method") {
    return null;
  }

  const { updateSubscriptionStatus } = await import(
    "@/lib/billing/subscription-service"
  );
  const { updatePaymentAttemptStatus } = await import(
    "@/lib/billing/webhook-processor"
  );

  await Promise.all([
    updatePaymentAttemptStatus(latestAttempt.providerPaymentId, "expired"),
    updateSubscriptionStatus(userId, "expired"),
  ]);

  return null;
}

/**
 * Creates a checkout session for an account upgrade.
 * Selects the provider based on the billing currency.
 */
export async function createCheckoutAction(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const user = await requireUser();

  const businessId = formData.get("businessId");
  const plan = formData.get("plan");
  const currency = formData.get("currency");
  const interval = (formData.get("interval") as BillingInterval) ?? "monthly";

  if (
    typeof businessId !== "string" ||
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

  // Verify business ownership (subscription is account-level, but we validate via business context)
  const businessContext = await getBusinessContextForUser(user.id, businessId);

  if (!businessContext) {
    return { error: "Business not found." };
  }

  if (businessContext.role !== "owner") {
    return { error: "Only business owners can manage billing." };
  }

  // Check current plan from account subscription
  const existingSubscription = await getAccountSubscription(user.id);
  const currentPlan = existingSubscription
    ? resolveEffectivePlanFromSubscription(existingSubscription)
    : "free";

  if (currentPlan === plan) {
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

    const existingPendingCheckout = await getPendingPaymongoCheckoutForUser(
      user.id,
    );

    if (existingPendingCheckout?.provider === "paymongo") {
      return {
        qrData: {
          amount: existingPendingCheckout.amount,
          currency: "PHP",
          expiresAt: existingPendingCheckout.expiresAt,
          paymentIntentId: existingPendingCheckout.paymentIntentId,
          qrCodeData: existingPendingCheckout.qrCodeData,
        },
      };
    }

    const { createQrPhCheckout } = await import(
      "@/lib/billing/providers/paymongo"
    );

    const result = await createQrPhCheckout({
      plan: typedPlan,
      userId: user.id,
      businessId,
      interval: typedInterval,
    });

    if (result.type === "error") {
      return { error: result.message };
    }

    if (result.type === "qrph") {
      // Only create a pending subscription after we have a valid QR code
      await createPendingSubscription({
        userId: user.id,
        plan: typedPlan,
        provider: "paymongo",
        currency: "PHP",
      });

      // Record pending payment
      await recordPaymentAttempt({
        userId: user.id,
        businessId,
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
    userId: user.id,
    businessId,
    userEmail: user.email,
    userName: user.name,
    interval: typedInterval,
  });

  if (result.type === "error") {
    return { error: result.message };
  }

  if (result.type === "redirect") {
    await recordPaymentAttempt({
      amount: getPlanPrice(typedPlan, "USD", typedInterval),
      currency: "USD",
      plan: typedPlan,
      provider: "paddle",
      providerPaymentId: result.url,
      status: "pending",
      userId: user.id,
      businessId,
    });

    return { paddleTransactionId: result.url };
  }

  return { error: "Unexpected checkout result." };
}

/**
 * Cancels the current account subscription.
 */
export async function cancelSubscriptionAction(
  _prev: CancelActionState,
  formData: FormData,
): Promise<CancelActionState> {
  const user = await requireUser();

  const businessId = formData.get("businessId");

  if (typeof businessId !== "string") {
    return { error: "Invalid input." };
  }

  // Verify business ownership
  const businessContext = await getBusinessContextForUser(user.id, businessId);

  if (!businessContext) {
    return { error: "Business not found." };
  }

  if (businessContext.role !== "owner") {
    return { error: "Only business owners can manage billing." };
  }

  // Get subscription
  const { getAccountSubscription } = await import(
    "@/lib/billing/subscription-service"
  );
  const subscription = await getAccountSubscription(user.id);

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
    await updateSubscriptionStatus(user.id, "active", {
      canceledAt: new Date(),
    });
    const { db } = await import("@/lib/db/client");

    await writeAuditLog(db, {
      businessId,
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

    revalidatePath(getBusinessPath(businessContext.business.slug));

    return { success: "Subscription canceled. You\u2019ll keep access until the end of your billing period." };
  }

  // For PayMongo (no managed subscription), cancel locally and immediately
  const { cancelSubscription } = await import(
    "@/lib/billing/subscription-service"
  );
  const updatedSubscription = await cancelSubscription(user.id);

  if (updatedSubscription) {
    const { db } = await import("@/lib/db/client");
    await writeAuditLog(db, {
      businessId,
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

  revalidatePath(getBusinessPath(businessContext.business.slug));

  if (isPending) {
    return { success: "Pending payment canceled." };
  }

  return { success: "Subscription canceled. You\u2019ll keep access until the end of your billing period." };
}

export async function getPendingCheckoutAction(
  userId: string,
): Promise<PendingCheckoutState | null> {
  const user = await requireUser();

  if (user.id !== userId) {
    return null;
  }

  return getPendingPaymongoCheckoutForUser(userId);
}

export async function getCheckoutStatusAction(
  userId: string,
  providerPaymentId?: string | null,
): Promise<CheckoutStatusSnapshot | null> {
  const user = await requireUser();

  if (user.id !== userId) {
    return null;
  }

  const [subscription, paymentAttempt] = await Promise.all([
    getAccountSubscription(userId),
    providerPaymentId
      ? getLatestPaymentAttemptForCheckout(userId, providerPaymentId)
      : Promise.resolve(null),
  ]);

  return {
    subscription: subscription
      ? {
          effectivePlan: resolveEffectivePlanFromSubscription(subscription),
          plan: subscription.plan,
          status: subscription.status,
        }
      : null,
    paymentAttempt: paymentAttempt
      ? {
          providerPaymentId: paymentAttempt.providerPaymentId,
          status: paymentAttempt.status,
        }
      : null,
  };
}

/**
 * Retrieves pending QRPh checkout data for a user account.
 */
export async function getPendingQrPhCheckoutAction(
  userId: string,
): Promise<PendingQrPhData | null> {
  const pendingCheckout = await getPendingCheckoutAction(userId);

  if (!pendingCheckout || pendingCheckout.provider !== "paymongo") {
    return null;
  }

  return {
    amount: pendingCheckout.amount,
    currency: "PHP",
    expiresAt: pendingCheckout.expiresAt,
    paymentIntentId: pendingCheckout.paymentIntentId,
    plan: pendingCheckout.plan,
    qrCodeData: pendingCheckout.qrCodeData,
  };
}

/**
 * Cleans up an expired pending PayMongo subscription.
 */
export async function cleanupExpiredPendingAction(
  userId: string,
): Promise<void> {
  const user = await requireUser();

  if (user.id !== userId) return;

  const subscription = await getAccountSubscription(userId);
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
  const pendingAttempt = await getLatestPendingPaymentAttempt(userId, "paymongo");
  const { updatePaymentAttemptStatus } = await import(
    "@/lib/billing/webhook-processor"
  );

  await Promise.all([
    expireSubscription(userId),
    pendingAttempt
      ? updatePaymentAttemptStatus(pendingAttempt.providerPaymentId, "expired")
      : Promise.resolve(false),
  ]);
}

/**
 * Cancels an active QRPh checkout from the explicit cancel action in the QR view.
 */
export async function cancelPendingQrCheckoutAction(
  userId: string,
  paymentIntentId: string,
): Promise<CancelPendingQrCheckoutResult> {
  const user = await requireUser();

  if (!userId || !paymentIntentId) {
    return {
      ok: false,
      error: "Missing checkout details.",
    };
  }

  if (user.id !== userId) {
    return {
      ok: false,
      error: "Not authorized.",
    };
  }

  const subscription = await getAccountSubscription(userId);

  if (
    !subscription ||
    subscription.status !== "pending" ||
    subscription.billingProvider !== "paymongo"
  ) {
    return {
      ok: true,
      outcome: "already_canceled",
    };
  }

  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { and, eq } = await import("drizzle-orm");

  const [attempt] = await db
    .select({ id: paymentAttempts.id })
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.userId, userId),
        eq(paymentAttempts.provider, "paymongo"),
        eq(paymentAttempts.providerPaymentId, paymentIntentId),
        eq(paymentAttempts.status, "pending"),
      ),
    )
    .limit(1);

  if (!attempt) {
    return {
      ok: true,
      outcome: "already_canceled",
    };
  }

  const { cancelPaymentIntent } = await import(
    "@/lib/billing/providers/paymongo"
  );
  const result = await cancelPaymentIntent(paymentIntentId);

  if (result.ok && result.status === "active") {
    return {
      ok: true,
      outcome: "already_paid",
    };
  }

  const { updateSubscriptionStatus } = await import(
    "@/lib/billing/subscription-service"
  );
  const { updatePaymentAttemptStatus } = await import(
    "@/lib/billing/webhook-processor"
  );

  await Promise.all([
    updatePaymentAttemptStatus(paymentIntentId, "expired"),
    updateSubscriptionStatus(userId, "incomplete"),
  ]);

  if (!result.ok) {
    console.error(
      "[Billing] Failed to cancel PayMongo payment intent. Falling back to local checkout cleanup.",
      {
        error: result.message,
        paymentIntentId,
        userId,
      },
    );
  }

  return {
    ok: true,
    outcome: "canceled",
  };
}
