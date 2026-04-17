import { NextResponse } from "next/server";

import {
  verifyPaddleWebhookSignature,
  mapPaddleStatus,
} from "@/lib/billing/providers/paddle";
import {
  recordWebhookEvent,
  markEventProcessed,
  recordPaymentAttempt,
} from "@/lib/billing/webhook-processor";
import {
  activateSubscription,
  updateSubscriptionStatus,
  expireSubscription,
} from "@/lib/billing/subscription-service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature") ?? "";

  // 1. Verify signature
  if (!verifyPaddleWebhookSignature(rawBody, signature)) {
    console.error("[Paddle Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse payload
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

  // 3. Extract data
  const data = payload.data as Record<string, unknown> | undefined;
  const customData = data?.custom_data as
    | Record<string, string>
    | undefined;
  const workspaceId = customData?.workspace_id;
  const plan = customData?.plan;

  // Subscription fields
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

  // 4. Idempotency check
  const { isNew, eventId: storedEventId } = await recordWebhookEvent({
    providerEventId: eventId,
    provider: "paddle",
    eventType,
    workspaceId: workspaceId ?? null,
    payload,
  });

  if (!isNew) {
    return NextResponse.json({ message: "Event already processed" });
  }

  // 5. Process event
  try {
    switch (eventType) {
      case "subscription.created":
      case "subscription.activated": {
        if (!workspaceId || !plan || !subscriptionId) {
          console.warn(
            `[Paddle Webhook] Missing data for ${eventType}`,
          );
          break;
        }

        const periodStart = billingPeriod?.starts_at
          ? new Date(billingPeriod.starts_at)
          : new Date();
        const periodEnd = billingPeriod?.ends_at
          ? new Date(billingPeriod.ends_at)
          : null;

        await activateSubscription({
          workspaceId,
          plan: plan as "pro" | "business",
          provider: "paddle",
          currency: "USD",
          status: mapPaddleStatus(paddleStatus ?? "active"),
          providerSubscriptionId: subscriptionId,
          providerCustomerId: customerId ?? null,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        });

        console.log(
          `[Paddle Webhook] Subscription ${eventType}: ${plan} for workspace ${workspaceId}`,
        );
        break;
      }

      case "subscription.updated": {
        if (!workspaceId || !subscriptionId) {
          console.warn(
            "[Paddle Webhook] Missing workspaceId for subscription.updated",
          );
          break;
        }

        const status = mapPaddleStatus(paddleStatus ?? "active");
        const periodEnd = billingPeriod?.ends_at
          ? new Date(billingPeriod.ends_at)
          : null;

        // Check if there's a scheduled cancellation
        const canceledAt =
          scheduledChange?.action === "cancel"
            ? new Date()
            : undefined;

        await updateSubscriptionStatus(workspaceId, status, {
          providerSubscriptionId: subscriptionId,
          currentPeriodEnd: periodEnd,
          ...(canceledAt ? { canceledAt } : {}),
        });

        console.log(
          `[Paddle Webhook] Subscription updated: ${paddleStatus} for workspace ${workspaceId}`,
        );
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

        console.log(
          `[Paddle Webhook] Subscription cancelled for workspace ${workspaceId}`,
        );
        break;
      }

      case "subscription.past_due": {
        if (!workspaceId) {
          break;
        }

        await updateSubscriptionStatus(workspaceId, "past_due");

        console.log(
          `[Paddle Webhook] Subscription past due for workspace ${workspaceId}`,
        );
        break;
      }

      case "transaction.completed": {
        if (!workspaceId || !plan) {
          break;
        }

        // Extract transaction amount
        const details = data?.details as
          | Record<string, unknown>
          | undefined;
        const totals = details?.totals as
          | Record<string, unknown>
          | undefined;
        const total = totals?.total as string | undefined;
        const currencyCode = (data?.currency_code as string) ?? "USD";
        const transactionId = data?.id as string;

        await recordPaymentAttempt({
          workspaceId,
          plan,
          provider: "paddle",
          providerPaymentId: transactionId ?? eventId,
          amount: total ? parseInt(total, 10) : 0,
          currency: currencyCode === "PHP" ? "PHP" : "USD",
          status: "succeeded",
        });

        console.log(
          `[Paddle Webhook] Transaction completed for workspace ${workspaceId}`,
        );
        break;
      }

      case "transaction.payment_failed": {
        if (!workspaceId) {
          break;
        }

        const transactionId = data?.id as string;

        await recordPaymentAttempt({
          workspaceId,
          plan: plan ?? "pro",
          provider: "paddle",
          providerPaymentId: transactionId ?? eventId,
          amount: 0,
          currency: "USD",
          status: "failed",
        });

        console.log(
          `[Paddle Webhook] Transaction failed for workspace ${workspaceId}`,
        );
        break;
      }

      default:
        console.log(`[Paddle Webhook] Unhandled event: ${eventType}`);
    }

    await markEventProcessed(storedEventId);
  } catch (error) {
    console.error("[Paddle Webhook] Processing error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "OK" });
}
