"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/features/audit/mutations";
import {
  enforceActiveBusinessLimitOnPlanChange,
  listLockCandidatesForDowngrade,
} from "@/features/businesses/plan-enforcement";
import { getBusinessPath } from "@/features/businesses/routes";
import type {
  CancelActionState,
  CancelPendingQrCheckoutResult,
  CheckoutActionState,
  CheckoutStatusSnapshot,
  PendingCheckoutState,
} from "@/features/billing/types";
import { requireUser } from "@/lib/auth/session";
import { getPlanPrice } from "@/lib/billing/plans";
import { createPaddleTransaction } from "@/lib/billing/providers/paddle";
import {
  getAccountSubscription,
  resolveEffectivePlanFromSubscription,
} from "@/lib/billing/subscription-service";
import { recordPaymentAttempt } from "@/lib/billing/webhook-processor";
import { getBusinessContextForUser } from "@/lib/db/business-access";
import { isPaddleConfigured } from "@/lib/env";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";

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

  if (plan !== "pro" && plan !== "business") {
    return { error: "Invalid plan selected." };
  }

  if (currency !== "USD") {
    return { error: "Only USD checkout is supported." };
  }

  const businessContext = await getBusinessContextForUser(user.id, businessId);
  if (!businessContext) {
    return { error: "Business not found." };
  }
  if (businessContext.role !== "owner") {
    return { error: "Only business owners can manage billing." };
  }

  const existingSubscription = await getAccountSubscription(user.id);
  const currentPlan = existingSubscription
    ? resolveEffectivePlanFromSubscription(existingSubscription)
    : "free";

  if (currentPlan === plan) {
    return { error: `You're already on the ${plan} plan.` };
  }

  if (!isPaddleConfigured) {
    return { error: "Paddle checkout is not configured." };
  }

  const typedPlan = plan as PaidPlan;
  const typedInterval: BillingInterval =
    interval === "yearly" ? "yearly" : "monthly";

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

export async function cancelSubscriptionAction(
  _prev: CancelActionState,
  formData: FormData,
): Promise<CancelActionState> {
  const user = await requireUser();

  const businessId = formData.get("businessId");
  const keepBusinessId = formData.get("keepBusinessId");

  if (typeof businessId !== "string") {
    return { error: "Invalid input." };
  }

  const selectedKeepBusinessId =
    typeof keepBusinessId === "string" && keepBusinessId.length > 0
      ? keepBusinessId
      : null;

  const businessContext = await getBusinessContextForUser(user.id, businessId);
  if (!businessContext) {
    return { error: "Business not found." };
  }
  if (businessContext.role !== "owner") {
    return { error: "Only business owners can manage billing." };
  }

  const subscription = await getAccountSubscription(user.id);
  if (!subscription || subscription.status === "free") {
    return { error: "No active subscription to cancel." };
  }

  const isPending = subscription.status === "pending";
  const downgradePreview = await listLockCandidatesForDowngrade({
    ownerUserId: user.id,
    targetPlan: "free",
  });

  if (downgradePreview.requiresSelection && !selectedKeepBusinessId) {
    return {
      error:
        "Choose which business stays active on Free before you continue.",
    };
  }

  if (
    selectedKeepBusinessId &&
    !downgradePreview.activeBusinesses.some(
      (business) => business.id === selectedKeepBusinessId,
    )
  ) {
    return {
      error: "The selected business could not be used for downgrade.",
    };
  }

  if (subscription.providerSubscriptionId) {
    const { cancelPaddleSubscription } = await import(
      "@/lib/billing/providers/paddle"
    );
    const success = await cancelPaddleSubscription(
      subscription.providerSubscriptionId,
    );
    if (!success) {
      return { error: "Failed to cancel subscription. Please try again." };
    }

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
    return {
      success:
        "Subscription canceled. You’ll keep access until the end of your billing period.",
    };
  }

  const { cancelSubscription } = await import("@/lib/billing/subscription-service");
  const updatedSubscription = await cancelSubscription(user.id);

  const effectivePlanAfterCancel = updatedSubscription
    ? resolveEffectivePlanFromSubscription(updatedSubscription)
    : "free";

  if (effectivePlanAfterCancel === "free") {
    await enforceActiveBusinessLimitOnPlanChange({
      ownerUserId: user.id,
      newPlan: "free",
      keepBusinessId: selectedKeepBusinessId,
      actorUserId: user.id,
    });
  }

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

  return {
    success:
      "Subscription canceled. You’ll keep access until the end of your billing period.",
  };
}

export async function getPendingCheckoutAction(
  userId: string,
): Promise<PendingCheckoutState | null> {
  const user = await requireUser();
  if (user.id !== userId) {
    return null;
  }
  return null;
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

export async function cleanupExpiredPendingAction(_userId: string): Promise<void> {
  return;
}

export async function cancelPendingQrCheckoutAction(
  _userId?: string,
  _paymentIntentId?: string,
): Promise<CancelPendingQrCheckoutResult> {
  return {
    ok: true,
    outcome: "already_canceled",
  };
}
