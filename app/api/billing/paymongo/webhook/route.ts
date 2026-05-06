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
  getWorkspaceSubscription,
  updateSubscriptionStatus,
} from "@/lib/billing/subscription-service";
import type { BillingInterval } from "@/lib/billing/types";
import { writeSubscriptionTransitionAuditLogs } from "@/features/audit/subscription";
import { finalizeScheduledWorkspaceDeletionIfDue } from "@/features/workspaces/mutations";

function runAfterResponse(task: () => Promise<unknown> | unknown) {
  try {
    after(task);
  } catch {
    void task();
  }
}

async function getPaymongoAttempt(providerPaymentId: string) {
  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { desc, eq } = await import("drizzle-orm");

  const [attempt] = await db
    .select({
      amount: paymentAttempts.amount,
      plan: paymentAttempts.plan,
      workspaceId: paymentAttempts.workspaceId,
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

async function getLatestPendingPaymongoAttempt(workspaceId: string) {
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
        eq(paymentAttempts.workspaceId, workspaceId),
        eq(paymentAttempts.provider, "paymongo"),
        eq(paymentAttempts.status, "pending"),
      ),
    )
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(1);

  return attempt ?? null;
}

async function expireOtherPendingPaymongoAttempts(
  workspaceId: string,
  excludeProviderPaymentId?: string | null,
) {
  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { and, eq, ne } = await import("drizzle-orm");

  const conditions = [
    eq(paymentAttempts.workspaceId, workspaceId),
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
  const workspaceId = matchedAttempt?.workspaceId ?? metadata?.workspace_id;
  const plan = matchedAttempt?.plan ?? metadata?.plan;

  const { eventId: storedEventId, isNew } = await recordWebhookEvent({
    providerEventId: eventId,
    provider: "paymongo",
    eventType,
    payload,
    workspaceId: workspaceId ?? null,
  });

  if (!isNew) {
    return NextResponse.json({ message: "Event already processed" });
  }

  try {
    if (eventType === "payment.paid" && workspaceId && plan) {
      const previousSubscription = await getWorkspaceSubscription(workspaceId);
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
        : await getLatestPendingPaymongoAttempt(workspaceId);
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
            workspaceId,
          });
        }
      }

      await expireOtherPendingPaymongoAttempts(
        workspaceId,
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
        workspaceId,
      });

      runAfterResponse(() =>
        writeSubscriptionTransitionAuditLogs({
          workspaceId,
          previousSubscription,
          nextSubscription,
          source: "webhook",
          providerEventId: eventId,
        }),
      );
    } else if (eventType === "payment.failed" && workspaceId) {
      const latestPendingAttempt = providerPaymentId
        ? null
        : await getLatestPendingPaymongoAttempt(workspaceId);
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
            workspaceId,
          });
        }
      }

      const subscription = await getWorkspaceSubscription(workspaceId);

      if (subscription?.status === "pending") {
        await updateSubscriptionStatus(workspaceId, "incomplete");
      }
    } else if (eventType === "qrph.expired" && workspaceId) {
      const latestPendingAttempt = providerPaymentId
        ? null
        : await getLatestPendingPaymongoAttempt(workspaceId);
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
            workspaceId,
          });
        }
      }

      const subscription = await getWorkspaceSubscription(workspaceId);

      if (subscription?.status === "pending") {
        await updateSubscriptionStatus(workspaceId, "expired");
      }
    }

    if (workspaceId) {
      runAfterResponse(() => finalizeScheduledWorkspaceDeletionIfDue(workspaceId));
    }

    await markEventProcessed(storedEventId);
  } catch {
    console.error("[PayMongo Webhook] Processing error.", {
      eventType,
      workspaceId: workspaceId ?? null,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "OK" });
}
