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
  CheckoutStatusSnapshot,
} from "@/features/billing/types";
import { requireUser } from "@/lib/auth/session";
import { getBillingProvider } from "@/lib/billing/providers";
import {
  getAccountSubscription,
  resolveEffectivePlanFromSubscription,
} from "@/lib/billing/subscription-service";
import { getBusinessContextForUser } from "@/lib/db/business-access";

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
    const providerCanceled = await getBillingProvider("dodo").cancelSubscription(
      subscription.providerSubscriptionId,
    );

    if (!providerCanceled) {
      return {
        error:
          "We couldn’t cancel your subscription with the payment provider. Please try again in a moment.",
      };
    }
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
