import { NextResponse } from "next/server";

import {
  verifyPayMongoWebhookSignature,
} from "@/lib/billing/providers/paymongo";
import {
  recordWebhookEvent,
  markEventProcessed,
  recordPaymentAttempt,
  updatePaymentAttemptStatus,
} from "@/lib/billing/webhook-processor";
import {
  activateSubscription,
  updateSubscriptionStatus,
  getWorkspaceSubscription,
} from "@/lib/billing/subscription-service";

export async function POST(request: Request) {
  console.log("[PayMongo Webhook] ⚡ Webhook received!");
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature") ?? "";

  // 1. Verify signature
  if (!verifyPayMongoWebhookSignature(rawBody, signature)) {
    console.error("[PayMongo Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse payload
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

  // 3. Extract payment data
  const eventData = attributes?.data as Record<string, unknown> | undefined;
  const paymentAttributes = eventData?.attributes as
    | Record<string, unknown>
    | undefined;
  const metadata = paymentAttributes?.metadata as
    | Record<string, string>
    | undefined;
  const workspaceId = metadata?.workspace_id;
  const plan = metadata?.plan;

  // 4. Idempotency check
  const { isNew, eventId: storedEventId } = await recordWebhookEvent({
    providerEventId: eventId,
    provider: "paymongo",
    eventType,
    workspaceId: workspaceId ?? null,
    payload,
  });

  if (!isNew) {
    return NextResponse.json({ message: "Event already processed" });
  }

  // 5. Process event
  try {
    if (eventType === "payment.paid" && workspaceId && plan) {
      const amount = (paymentAttributes?.amount as number) ?? 0;
      const paymentId = (eventData?.id as string) ?? eventId;

      // Record payment attempt
      await recordPaymentAttempt({
        workspaceId,
        plan,
        provider: "paymongo",
        providerPaymentId: paymentId,
        amount,
        currency: "PHP",
        status: "succeeded",
      });

      // Calculate billing period (30 days from now)
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Activate or update subscription
      await activateSubscription({
        workspaceId,
        plan: plan as "pro" | "business",
        provider: "paymongo",
        currency: "PHP",
        status: "active",
        providerCheckoutId: paymentId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });

      console.log(
        `[PayMongo Webhook] Activated ${plan} for workspace ${workspaceId}`,
      );
    } else if (eventType === "payment.failed" && workspaceId) {
      const paymentId = (eventData?.id as string) ?? eventId;

      await updatePaymentAttemptStatus(paymentId, "failed");

      // Update subscription to incomplete if it was pending
      const subscription = await getWorkspaceSubscription(workspaceId);
      if (subscription?.status === "pending") {
        await updateSubscriptionStatus(workspaceId, "incomplete");
      }

      console.log(
        `[PayMongo Webhook] Payment failed for workspace ${workspaceId}`,
      );
    } else if (eventType === "payment.expired" && workspaceId) {
      const paymentId = (eventData?.id as string) ?? eventId;

      await updatePaymentAttemptStatus(paymentId, "expired");

      const subscription = await getWorkspaceSubscription(workspaceId);
      if (subscription?.status === "pending") {
        await updateSubscriptionStatus(workspaceId, "expired");
      }

      console.log(
        `[PayMongo Webhook] Payment expired for workspace ${workspaceId}`,
      );
    }

    await markEventProcessed(storedEventId);
  } catch (error) {
    console.error("[PayMongo Webhook] Processing error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "OK" });
}
