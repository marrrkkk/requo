"use server";

import type { CheckoutStatusSnapshot } from "@/features/billing/types";
import { requireUser } from "@/lib/auth/session";
import {
  getAccountSubscription,
  resolveEffectivePlanFromSubscription,
} from "@/lib/billing/subscription-service";

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
