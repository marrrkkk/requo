import "server-only";

/**
 * Dodo Payments webhook handler.
 *
 * Receives every Dodo webhook event, verifies the signature against
 * `DODO_WEBHOOK_SECRET` per Standard Webhooks signing, deduplicates
 * via `billing_events`, and dispatches normalized events to the
 * subscription service, payment-attempt recorder, or refund table.
 *
 * Idempotency contract: the unique constraint on
 * `billing_events.providerEventId` causes any duplicate delivery to
 * short-circuit to HTTP 200 without side effects. Permanent failures
 * (e.g. user not found) also return 200 to stop retries; transient
 * failures return 500 so Dodo retries.
 */

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getBillingProvider } from "@/lib/billing/providers";
import type { NormalizedWebhookEvent } from "@/lib/billing/providers";
import { applyApprovedRefundSideEffects } from "@/lib/billing/refunds";
import {
  activateSubscription,
  expireSubscription,
  getAccountSubscription,
  updateSubscriptionStatus,
} from "@/lib/billing/subscription-service";
import {
  markEventFailed,
  markEventIgnored,
  markEventProcessed,
  recordPaymentAttempt,
  recordWebhookEvent,
} from "@/lib/billing/webhook-processor";
import { db } from "@/lib/db/client";
import {
  accountSubscriptions,
  refunds,
  type BillingCurrency,
} from "@/lib/db/schema/subscriptions";
import type { BusinessPlan } from "@/lib/plans/plans";

type Payload = NormalizedWebhookEvent["payload"];

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function readCurrency(value: string | undefined): BillingCurrency {
  return value === "PHP" ? "PHP" : "USD";
}

function readPaidPlan(value: string | undefined): BusinessPlan {
  if (value === "pro" || value === "business") return value;
  return "free";
}

/**
 * Resolves the user id for a webhook event.
 *
 * Order of resolution:
 *   1. `payload.userId` (set in checkout session metadata).
 *   2. Lookup in `account_subscriptions` by `providerSubscriptionId`.
 */
async function resolveUserId(payload: Payload): Promise<string | null> {
  if (payload.userId) return payload.userId;

  if (payload.subscriptionId) {
    const [row] = await db
      .select({ userId: accountSubscriptions.userId })
      .from(accountSubscriptions)
      .where(
        eq(accountSubscriptions.providerSubscriptionId, payload.subscriptionId),
      )
      .limit(1);

    if (row) return row.userId;
  }

  return null;
}

/* ── Per-event handlers ───────────────────────────────────────────────────── */

async function handleSubscriptionActivated(
  userId: string,
  payload: Payload,
): Promise<void> {
  const plan = readPaidPlan(payload.plan);

  if (plan === "free") {
    throw new Error(
      `Cannot activate subscription with unknown plan: ${payload.plan ?? "(none)"}`,
    );
  }

  const currency = readCurrency(payload.currency);

  await activateSubscription({
    userId,
    plan,
    provider: "dodo",
    currency,
    adaptiveCurrency: payload.currency === "PHP",
    providerCustomerId: payload.customerId ?? null,
    providerSubscriptionId: payload.subscriptionId ?? null,
    currentPeriodStart: payload.currentPeriodStart ?? null,
    currentPeriodEnd: payload.currentPeriodEnd ?? null,
  });
}

async function handleSubscriptionCanceled(
  userId: string,
  payload: Payload,
): Promise<void> {
  await updateSubscriptionStatus(userId, "canceled", {
    canceledAt: new Date(),
    currentPeriodEnd: payload.currentPeriodEnd ?? undefined,
  });
}

async function handleSubscriptionExpired(userId: string): Promise<void> {
  await expireSubscription(userId);
}

async function handleSubscriptionPastDue(
  userId: string,
  payload: Payload,
): Promise<void> {
  await updateSubscriptionStatus(userId, "past_due", {
    currentPeriodStart: payload.currentPeriodStart ?? undefined,
    currentPeriodEnd: payload.currentPeriodEnd ?? undefined,
  });
}

async function handlePaymentAttempt(
  userId: string,
  payload: Payload,
  status: "succeeded" | "failed",
): Promise<void> {
  if (!payload.paymentId) {
    throw new Error("Missing payment id on payment event.");
  }

  const subscription = await getAccountSubscription(userId);
  const plan = readPaidPlan(payload.plan ?? subscription?.plan);

  await recordPaymentAttempt({
    userId,
    plan: plan === "free" ? (subscription?.plan ?? "pro") : plan,
    provider: "dodo",
    providerPaymentId: payload.paymentId,
    amount: payload.amount ?? 0,
    currency: readCurrency(payload.currency ?? subscription?.billingCurrency),
    status,
  });
}

async function handleRefundUpdate(
  userId: string,
  payload: Payload,
  status: "approved" | "failed",
): Promise<void> {
  if (!payload.paymentId && !payload.refundId) {
    throw new Error("Missing payment and refund identifiers on refund event.");
  }

  const subscription = await getAccountSubscription(userId);
  const currency = readCurrency(payload.currency ?? subscription?.billingCurrency);
  const now = new Date();

  // Try to locate an existing refund row by refundId first, then paymentId.
  let existingId: string | null = null;

  if (payload.refundId) {
    const [byRefund] = await db
      .select({ id: refunds.id })
      .from(refunds)
      .where(eq(refunds.providerRefundId, payload.refundId))
      .limit(1);
    if (byRefund) existingId = byRefund.id;
  }

  if (!existingId && payload.paymentId) {
    const [byPayment] = await db
      .select({ id: refunds.id })
      .from(refunds)
      .where(eq(refunds.providerPaymentId, payload.paymentId))
      .limit(1);
    if (byPayment) existingId = byPayment.id;
  }

  if (existingId) {
    await db
      .update(refunds)
      .set({
        status,
        providerRefundId: payload.refundId ?? undefined,
        updatedAt: now,
      })
      .where(eq(refunds.id, existingId));
  } else {
    // Refund initiated outside the app (e.g. dashboard) — record it now.
    await db.insert(refunds).values({
      id: generateId("rfd"),
      userId,
      provider: "dodo",
      providerRefundId: payload.refundId ?? null,
      providerPaymentId: payload.paymentId ?? "",
      amount: payload.amount ?? 0,
      currency,
      status,
      reason: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (status === "approved") {
    await applyApprovedRefundSideEffects(userId);
  }
}

/* ── Dispatcher ───────────────────────────────────────────────────────────── */

async function dispatchEvent(
  userId: string,
  event: NormalizedWebhookEvent,
): Promise<void> {
  switch (event.eventType) {
    case "subscription.activated":
      await handleSubscriptionActivated(userId, event.payload);
      return;

    case "subscription.canceled":
      await handleSubscriptionCanceled(userId, event.payload);
      return;

    case "subscription.expired":
      await handleSubscriptionExpired(userId);
      return;

    case "subscription.past_due":
      await handleSubscriptionPastDue(userId, event.payload);
      return;

    case "subscription.updated":
      // Status updates flow through other events. Nothing to do here.
      return;

    case "payment.succeeded":
      await handlePaymentAttempt(userId, event.payload, "succeeded");
      return;

    case "payment.failed":
      await handlePaymentAttempt(userId, event.payload, "failed");
      return;

    case "refund.succeeded":
      await handleRefundUpdate(userId, event.payload, "approved");
      return;

    case "refund.failed":
      await handleRefundUpdate(userId, event.payload, "failed");
      return;

    case "ignored":
    default:
      return;
  }
}

/* ── Route ────────────────────────────────────────────────────────────────── */

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const webhookId = request.headers.get("webhook-id") ?? "";
  const webhookTimestamp = request.headers.get("webhook-timestamp") ?? "";
  const signatureHeader = request.headers.get("webhook-signature") ?? "";

  if (!webhookId || !webhookTimestamp || !signatureHeader) {
    return NextResponse.json(
      { error: "Missing webhook signature headers." },
      { status: 401 },
    );
  }

  const provider = getBillingProvider("dodo");

  // Standard Webhooks signed payload format: `${id}.${timestamp}.${body}`.
  const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`;

  if (!provider.verifyWebhookSignature(signedPayload, signatureHeader)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let event: NormalizedWebhookEvent;
  try {
    event = provider.parseWebhookEvent(rawBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to parse webhook event.";
    console.error("[dodo webhook] parse error", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Use the Dodo-supplied event id when present; fall back to the
  // Standard Webhooks `webhook-id` header so the dedupe row is always
  // unique even when the body lacks an explicit id.
  const providerEventId = event.eventId || webhookId;

  if (!providerEventId) {
    return NextResponse.json(
      { error: "Missing webhook event id." },
      { status: 400 },
    );
  }

  // Resolve user up front so the persisted event row is correlated.
  const userId = await resolveUserId(event.payload);

  const recordResult = await recordWebhookEvent({
    providerEventId,
    provider: "dodo",
    eventType: event.rawEventType || event.eventType,
    userId,
    payload: { event, headers: { webhookId, webhookTimestamp } },
  });

  if (!recordResult.isNew) {
    // Duplicate delivery — already processed (or in flight). Acknowledge.
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  const eventId = recordResult.eventId;

  try {
    if (event.eventType === "ignored") {
      await markEventIgnored(eventId);
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    if (!userId) {
      await markEventFailed(eventId, "User not found");
      // Return 200 to prevent infinite retries — the event will never
      // succeed because the corresponding user does not exist.
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 200 },
      );
    }

    await dispatchEvent(userId, event);
    await markEventProcessed(eventId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook error.";
    console.error("[dodo webhook] processing error", message, {
      eventType: event.rawEventType,
      providerEventId,
    });

    try {
      await markEventFailed(eventId, message);
    } catch (markError) {
      console.error("[dodo webhook] failed to mark event failed", markError);
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
