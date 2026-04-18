import { NextResponse } from "next/server";

import {
  mapPaddleStatus,
  verifyPaddleWebhookSignature,
} from "@/lib/billing/providers/paddle";
import {
  markEventProcessed,
  recordPaymentAttempt,
  recordWebhookEvent,
} from "@/lib/billing/webhook-processor";
import {
  activateSubscription,
  expireSubscription,
  updateSubscriptionStatus,
} from "@/lib/billing/subscription-service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature") ?? "";

  if (!verifyPaddleWebhookSignature(rawBody, signature)) {
    console.error("[Paddle Webhook] Invalid signature.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.event_type as string | undefined;
  const eventId = (payload as Record<string, unknown>).event_id as
    | string
    | undefined;

  if (!eventType || !eventId) {
    return NextResponse.json(
      { error: "Missing event type or ID" },
      { status: 400 },
    );
  }

  const data = payload.data as Record<string, unknown> | undefined;
  const customData = data?.custom_data as Record<string, string> | undefined;
  const workspaceId = customData?.workspace_id;
  const plan = customData?.plan;
  const subscriptionId = data?.id as string | undefined;
  const paddleStatus = data?.status as string | undefined;
  const customerId = data?.customer_id as string | undefined;
  const billingPeriod = data?.current_billing_period as
    | { starts_at: string; ends_at: string }
    | undefined;
  const scheduledChange = data?.scheduled_change as
    | { action: string; effective_at: string }
    | null
    | undefined;

  const { eventId: storedEventId, isNew } = await recordWebhookEvent({
    providerEventId: eventId,
    provider: "paddle",
    eventType,
    payload,
    workspaceId: workspaceId ?? null,
  });

  if (!isNew) {
    return NextResponse.json({ message: "Event already processed" });
  }

  try {
    switch (eventType) {
      case "subscription.created":
      case "subscription.activated": {
        if (!workspaceId || !plan || !subscriptionId) {
          console.warn("[Paddle Webhook] Missing subscription activation data.", {
            eventType,
          });
          break;
        }

        const periodStart = billingPeriod?.starts_at
          ? new Date(billingPeriod.starts_at)
          : new Date();
        const periodEnd = billingPeriod?.ends_at
          ? new Date(billingPeriod.ends_at)
          : null;

        await activateSubscription({
          currency: "USD",
          currentPeriodEnd: periodEnd,
          currentPeriodStart: periodStart,
          plan: plan as "pro" | "business",
          provider: "paddle",
          providerCustomerId: customerId ?? null,
          providerSubscriptionId: subscriptionId,
          status: mapPaddleStatus(paddleStatus ?? "active"),
          workspaceId,
        });
        break;
      }

      case "subscription.updated": {
        if (!workspaceId || !subscriptionId) {
          console.warn("[Paddle Webhook] Missing subscription update data.");
          break;
        }

        const periodEnd = billingPeriod?.ends_at
          ? new Date(billingPeriod.ends_at)
          : null;
        const status = mapPaddleStatus(paddleStatus ?? "active");
        const canceledAt =
          scheduledChange?.action === "cancel" ? new Date() : undefined;

        await updateSubscriptionStatus(workspaceId, status, {
          ...(canceledAt ? { canceledAt } : {}),
          currentPeriodEnd: periodEnd,
          providerSubscriptionId: subscriptionId,
        });
        break;
      }

      case "subscription.canceled": {
        if (!workspaceId) {
          break;
        }

        const endsAt = billingPeriod?.ends_at
          ? new Date(billingPeriod.ends_at)
          : scheduledChange?.effective_at
            ? new Date(scheduledChange.effective_at)
            : null;

        await updateSubscriptionStatus(workspaceId, "canceled", {
          canceledAt: new Date(),
          currentPeriodEnd: endsAt,
        });
        break;
      }

      case "subscription.expired": {
        if (!workspaceId) {
          break;
        }

        await expireSubscription(workspaceId);
        break;
      }

      case "subscription.past_due": {
        if (!workspaceId) {
          break;
        }

        await updateSubscriptionStatus(workspaceId, "past_due");
        break;
      }

      case "transaction.completed": {
        if (!workspaceId || !plan) {
          break;
        }

        const details = data?.details as Record<string, unknown> | undefined;
        const totals = details?.totals as Record<string, unknown> | undefined;
        const total = totals?.total as string | undefined;
        const currencyCode = (data?.currency_code as string) ?? "USD";
        const transactionId = data?.id as string;

        await recordPaymentAttempt({
          amount: total ? Number.parseInt(total, 10) : 0,
          currency: currencyCode === "PHP" ? "PHP" : "USD",
          plan,
          provider: "paddle",
          providerPaymentId: transactionId ?? eventId,
          status: "succeeded",
          workspaceId,
        });
        break;
      }

      case "transaction.payment_failed": {
        if (!workspaceId) {
          break;
        }

        const transactionId = data?.id as string;

        await recordPaymentAttempt({
          amount: 0,
          currency: "USD",
          plan: plan ?? "pro",
          provider: "paddle",
          providerPaymentId: transactionId ?? eventId,
          status: "failed",
          workspaceId,
        });
        break;
      }

      default:
        console.warn("[Paddle Webhook] Unhandled event type.", {
          eventType,
        });
    }

    await markEventProcessed(storedEventId);
  } catch {
    console.error("[Paddle Webhook] Processing error.", {
      eventType,
      workspaceId: workspaceId ?? null,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "OK" });
}
