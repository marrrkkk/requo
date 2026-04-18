import { NextResponse } from "next/server";

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
  const workspaceId = metadata?.workspace_id;
  const plan = metadata?.plan;

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
      const amount = (paymentAttributes?.amount as number) ?? 0;
      const paymentId = (eventData?.id as string) ?? eventId;
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await recordPaymentAttempt({
        amount,
        currency: "PHP",
        plan,
        provider: "paymongo",
        providerPaymentId: paymentId,
        status: "succeeded",
        workspaceId,
      });

      await activateSubscription({
        currentPeriodEnd: periodEnd,
        currentPeriodStart: now,
        currency: "PHP",
        plan: plan as "pro" | "business",
        provider: "paymongo",
        providerCheckoutId: paymentId,
        status: "active",
        workspaceId,
      });
    } else if (eventType === "payment.failed" && workspaceId) {
      const paymentId = (eventData?.id as string) ?? eventId;

      await updatePaymentAttemptStatus(paymentId, "failed");

      const subscription = await getWorkspaceSubscription(workspaceId);

      if (subscription?.status === "pending") {
        await updateSubscriptionStatus(workspaceId, "incomplete");
      }
    } else if (eventType === "payment.expired" && workspaceId) {
      const paymentId = (eventData?.id as string) ?? eventId;

      await updatePaymentAttemptStatus(paymentId, "expired");

      const subscription = await getWorkspaceSubscription(workspaceId);

      if (subscription?.status === "pending") {
        await updateSubscriptionStatus(workspaceId, "expired");
      }
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
