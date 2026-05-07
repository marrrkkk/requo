import { after, NextResponse } from "next/server";

import { getPlanPrice } from "@/lib/billing/plans";
import { verifyPayMongoWebhookSignature } from "@/lib/billing/providers/paymongo";
import {
  markEventProcessed,
  recordPaymentAttempt,
  recordWebhookEvent,
  updatePaymentAttemptStatus,
} from "@/lib/billing/webhook-processor";
import {
  activateSubscription,
  getAccountSubscription,
  updateSubscriptionStatus,
} from "@/lib/billing/subscription-service";
import type { BillingInterval } from "@/lib/billing/types";
import { writeSubscriptionTransitionAuditLogs } from "@/features/audit/subscription";


function runAfterResponse(task: () => Promise<unknown> | unknown) {
  try {
    after(task);
  } catch {
    void task();
  }
}

/**
 * Resolves the userId from metadata or by looking up the business owner.
 */
async function resolveUserId(
  metadata: Record<string, string> | undefined,
  businessId: string | undefined,
): Promise<string | undefined> {
  // Prefer explicit user_id from metadata
  if (metadata?.user_id) {
    return metadata.user_id;
  }

  // Fall back to resolving from businessId (backward compat with in-flight payments)
  if (businessId) {
    const { db } = await import("@/lib/db/client");
    const { businesses } = await import("@/lib/db/schema/businesses");
    const { eq } = await import("drizzle-orm");

    const [biz] = await db
      .select({ ownerUserId: businesses.ownerUserId })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    return biz?.ownerUserId;
  }

  return undefined;
}

async function getPaymongoAttempt(providerPaymentId: string) {
  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { desc, eq } = await import("drizzle-orm");

  const [attempt] = await db
    .select({
      amount: paymentAttempts.amount,
      plan: paymentAttempts.plan,
      userId: paymentAttempts.userId,
      businessId: paymentAttempts.businessId,
    })
    .from(paymentAttempts)
    .where(eq(paymentAttempts.providerPaymentId, providerPaymentId))
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(1);

  return attempt ?? null;
}

function inferPaymongoBillingInterval(
  plan: string | undefined,
  amount: number,
  metadataInterval?: string | null,
): BillingInterval {
  if (metadataInterval === "yearly" || metadataInterval === "monthly") {
    return metadataInterval;
  }

  if (
    (plan === "pro" || plan === "business") &&
    amount === getPlanPrice(plan, "PHP", "yearly")
  ) {
    return "yearly";
  }

  return "monthly";
}

function addBillingPeriod(start: Date, interval: BillingInterval) {
  const end = new Date(start);

  if (interval === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
    return end;
  }

  end.setMonth(end.getMonth() + 1);
  return end;
}

async function getLatestPendingPaymongoAttempt(userId: string) {
  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { and, desc, eq } = await import("drizzle-orm");

  const [attempt] = await db
    .select({
      plan: paymentAttempts.plan,
      providerPaymentId: paymentAttempts.providerPaymentId,
    })
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.userId, userId),
        eq(paymentAttempts.provider, "paymongo"),
        eq(paymentAttempts.status, "pending"),
      ),
    )
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(1);

  return attempt ?? null;
}

async function expireOtherPendingPaymongoAttempts(
  userId: string,
  excludeProviderPaymentId?: string | null,
) {
  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { and, eq, ne } = await import("drizzle-orm");

  const conditions = [
    eq(paymentAttempts.userId, userId),
    eq(paymentAttempts.provider, "paymongo"),
    eq(paymentAttempts.status, "pending"),
  ];

  if (excludeProviderPaymentId) {
    conditions.push(ne(paymentAttempts.providerPaymentId, excludeProviderPaymentId));
  }

  await db
    .update(paymentAttempts)
    .set({ status: "expired" })
    .where(and(...conditions));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature") ?? "";

  if (!verifyPayMongoWebhookSignature(rawBody, signature)) {
    console.error("[PayMongo Webhook] Invalid signature.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = payload.data as Record<string, unknown> | undefined;

  if (!data) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const eventId = data.id as string;
  const attributes = data.attributes as Record<string, unknown> | undefined;
  const eventType = attributes?.type as string | undefined;

  if (!eventId || !eventType) {
    return NextResponse.json({ error: "Missing event data" }, { status: 400 });
  }

  const eventData = attributes?.data as Record<string, unknown> | undefined;
  const paymentAttributes = eventData?.attributes as
    | Record<string, unknown>
    | undefined;
  const metadata = paymentAttributes?.metadata as
    | Record<string, string>
    | undefined;
  const paymentId = (eventData?.id as string | undefined) ?? eventId;
  const source = paymentAttributes?.source as Record<string, unknown> | undefined;
  const paymentIntentId =
    (paymentAttributes?.payment_intent_id as string | undefined) ??
    (source?.payment_intent_id as string | undefined);
  const qrphAttributes = eventData?.attributes as Record<string, unknown> | undefined;
  const qrphPaymentIntentId = qrphAttributes?.payment_intent_id as
    | string
    | undefined;
  const providerPaymentId =
    eventType === "qrph.expired"
      ? qrphPaymentIntentId
      : paymentIntentId ?? paymentId;
  const matchedAttempt = providerPaymentId
    ? await getPaymongoAttempt(providerPaymentId)
    : null;
  const businessId = matchedAttempt?.businessId ?? metadata?.business_id;
  const plan = matchedAttempt?.plan ?? metadata?.plan;

  // Resolve userId from metadata, matched attempt, or business owner
  const userId =
    matchedAttempt?.userId ??
    await resolveUserId(metadata, businessId);

  const { eventId: storedEventId, isNew } = await recordWebhookEvent({
    providerEventId: eventId,
    provider: "paymongo",
    eventType,
    payload,
    userId: userId ?? null,
    businessId: businessId ?? null,
  });

  if (!isNew) {
    return NextResponse.json({ message: "Event already processed" });
  }

  try {
    if (eventType === "payment.paid" && userId && plan) {
      const previousSubscription = await getAccountSubscription(userId);
      const amount = (paymentAttributes?.amount as number) ?? 0;
      const billingInterval = inferPaymongoBillingInterval(
        plan,
        matchedAttempt?.amount ?? amount,
        metadata?.interval,
      );
      const now = new Date();
      const periodEnd = addBillingPeriod(now, billingInterval);
      const latestPendingAttempt = paymentIntentId
        ? null
        : await getLatestPendingPaymongoAttempt(userId);
      const resolvedPaymentAttemptId =
        paymentIntentId ?? latestPendingAttempt?.providerPaymentId ?? paymentId;

      if (resolvedPaymentAttemptId) {
        const updated = await updatePaymentAttemptStatus(
          resolvedPaymentAttemptId,
          "succeeded",
        );

        if (!updated) {
          await recordPaymentAttempt({
            amount,
            currency: "PHP",
            plan,
            provider: "paymongo",
            providerPaymentId: resolvedPaymentAttemptId,
            status: "succeeded",
            userId,
            businessId,
          });
        }
      }

      await expireOtherPendingPaymongoAttempts(
        userId,
        resolvedPaymentAttemptId,
      );

      const nextSubscription = await activateSubscription({
        currentPeriodEnd: periodEnd,
        currentPeriodStart: now,
        currency: "PHP",
        plan: plan as "pro" | "business",
        provider: "paymongo",
        providerCheckoutId: paymentId,
        status: "active",
        userId,
      });

      if (businessId) {
        runAfterResponse(() =>
          writeSubscriptionTransitionAuditLogs({
            businessId,
            previousSubscription,
            nextSubscription,
            source: "webhook",
            providerEventId: eventId,
          }),
        );
      }
    } else if (eventType === "payment.failed" && userId) {
      const latestPendingAttempt = providerPaymentId
        ? null
        : await getLatestPendingPaymongoAttempt(userId);
      const resolvedPaymentAttemptId =
        providerPaymentId ?? latestPendingAttempt?.providerPaymentId ?? null;

      if (resolvedPaymentAttemptId) {
        const updated = await updatePaymentAttemptStatus(
          resolvedPaymentAttemptId,
          "failed",
        );

        if (!updated && plan) {
          await recordPaymentAttempt({
            amount: (paymentAttributes?.amount as number) ?? 0,
            currency: "PHP",
            plan,
            provider: "paymongo",
            providerPaymentId: resolvedPaymentAttemptId,
            status: "failed",
            userId,
            businessId,
          });
        }
      }

      const subscription = await getAccountSubscription(userId);

      if (subscription?.status === "pending") {
        await updateSubscriptionStatus(userId, "incomplete");
      }
    } else if (eventType === "qrph.expired" && userId) {
      const latestPendingAttempt = providerPaymentId
        ? null
        : await getLatestPendingPaymongoAttempt(userId);
      const resolvedPaymentAttemptId =
        providerPaymentId ?? latestPendingAttempt?.providerPaymentId ?? null;

      if (resolvedPaymentAttemptId) {
        const updated = await updatePaymentAttemptStatus(
          resolvedPaymentAttemptId,
          "expired",
        );

        if (!updated && plan) {
          await recordPaymentAttempt({
            amount: 0,
            currency: "PHP",
            plan,
            provider: "paymongo",
            providerPaymentId: resolvedPaymentAttemptId,
            status: "expired",
            userId,
            businessId,
          });
        }
      }

      const subscription = await getAccountSubscription(userId);

      if (subscription?.status === "pending") {
        await updateSubscriptionStatus(userId, "expired");
      }
    }

    await markEventProcessed(storedEventId);
  } catch {
    console.error("[PayMongo Webhook] Processing error.", {
      eventType,
      userId: userId ?? null,
      businessId: businessId ?? null,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "OK" });
}
