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

export type UpgradeEligibleBusiness = {
  id: string;
  name: string;
  slug: string;
  plan: import("@/lib/plans/plans").BusinessPlan;
  logoUrl?: string | null;
  role: import("@/lib/business-members").BusinessMemberRole;
};

export async function getUserUpgradeEligibleBusinessesAction(): Promise<UpgradeEligibleBusiness[]> {
  const user = await requireUser();
  const { getBusinessMembershipsForUser } = await import("@/lib/db/business-access");
  const { canManageOperationalBusinessSettings } = await import("@/lib/business-members");

  const memberships = await getBusinessMembershipsForUser(user.id, "active");

  return memberships
    .filter(
      (m) =>
        m.business.recordState !== "trash" &&
        canManageOperationalBusinessSettings(m.role),
    )
    .map((m) => ({
      id: m.business.id,
      name: m.business.name,
      slug: m.business.slug,
      plan: m.business.plan,
      logoUrl: m.business.logoStoragePath
        ? `/api/business/${m.business.slug}/logo`
        : null,
      role: m.role,
    }));
}

