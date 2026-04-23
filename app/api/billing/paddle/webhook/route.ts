import { NextResponse } from "next/server";

import {
  mapPaddleStatus,
  verifyPaddleWebhookSignature,
} from "@/lib/billing/providers/paddle";
import {
  markEventProcessed,
  recordPaymentAttempt,
  recordWebhookEvent,
  updatePaymentAttemptStatus,
} from "@/lib/billing/webhook-processor";
import {
  activateSubscription,
  getWorkspaceSubscription,
  expireSubscription,
  updateSubscriptionStatus,
} from "@/lib/billing/subscription-service";
import { writeSubscriptionTransitionAuditLogs } from "@/features/audit/subscription";
import { finalizeScheduledWorkspaceDeletionIfDue } from "@/features/workspaces/mutations";

async function getPaddleAttempt(providerPaymentId: string) {
  const { db } = await import("@/lib/db/client");
  const { paymentAttempts } = await import("@/lib/db/schema/subscriptions");
  const { desc, eq } = await import("drizzle-orm");

  const [attempt] = await db
    .select({
      amount: paymentAttempts.amount,
      currency: paymentAttempts.currency,
      plan: paymentAttempts.plan,
      workspaceId: paymentAttempts.workspaceId,
    })
    .from(paymentAttempts)
    .where(eq(paymentAttempts.providerPaymentId, providerPaymentId))
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(1);

  return attempt ?? null;
}

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
  const transactionId = data?.id as string | undefined;
  const matchedAttempt = transactionId
    ? await getPaddleAttempt(transactionId)
    : null;
  const workspaceId = customData?.workspace_id ?? matchedAttempt?.workspaceId;
  const plan = customData?.plan ?? matchedAttempt?.plan;
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

        const previousSubscription = await getWorkspaceSubscription(workspaceId);
        const periodStart = billingPeriod?.starts_at
          ? new Date(billingPeriod.starts_at)
          : new Date();
        const periodEnd = billingPeriod?.ends_at
          ? new Date(billingPeriod.ends_at)
          : null;

        const nextSubscription = await activateSubscription({
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

        await writeSubscriptionTransitionAuditLogs({
          workspaceId,
          previousSubscription,
          nextSubscription,
          source: "webhook",
          providerEventId: eventId,
        });
        break;
      }

      case "subscription.updated": {
        if (!workspaceId || !subscriptionId) {
          console.warn("[Paddle Webhook] Missing subscription update data.");
          break;
        }

        const previousSubscription = await getWorkspaceSubscription(workspaceId);
        const periodEnd = billingPeriod?.ends_at
          ? new Date(billingPeriod.ends_at)
          : null;
        const status = mapPaddleStatus(paddleStatus ?? "active");
        const canceledAt =
          scheduledChange?.action === "cancel" ? new Date() : undefined;

        const nextSubscription = await updateSubscriptionStatus(workspaceId, status, {
          ...(canceledAt ? { canceledAt } : {}),
          currentPeriodEnd: periodEnd,
          providerSubscriptionId: subscriptionId,
        });

        await writeSubscriptionTransitionAuditLogs({
          workspaceId,
          previousSubscription,
          nextSubscription,
          source: "webhook",
          providerEventId: eventId,
        });
        break;
      }

      case "subscription.canceled": {
        if (!workspaceId) {
          break;
        }

        const previousSubscription = await getWorkspaceSubscription(workspaceId);
        const endsAt = billingPeriod?.ends_at
          ? new Date(billingPeriod.ends_at)
          : scheduledChange?.effective_at
            ? new Date(scheduledChange.effective_at)
            : null;

        const nextSubscription = await updateSubscriptionStatus(workspaceId, "canceled", {
          canceledAt: new Date(),
          currentPeriodEnd: endsAt,
        });

        await writeSubscriptionTransitionAuditLogs({
          workspaceId,
          previousSubscription,
          nextSubscription,
          source: "webhook",
          providerEventId: eventId,
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
        if (!workspaceId || !plan || !transactionId) {
          break;
        }

        const details = data?.details as Record<string, unknown> | undefined;
        const totals = details?.totals as Record<string, unknown> | undefined;
        const total = totals?.total as string | undefined;
        const currencyCode = (data?.currency_code as string) ?? "USD";
        const updated = await updatePaymentAttemptStatus(
          transactionId,
          "succeeded",
        );

        if (!updated) {
          await recordPaymentAttempt({
            amount: total
              ? Number.parseInt(total, 10)
              : matchedAttempt?.amount ?? 0,
            currency:
              currencyCode === "PHP"
                ? "PHP"
                : (matchedAttempt?.currency ?? "USD"),
            plan,
            provider: "paddle",
            providerPaymentId: transactionId,
            status: "succeeded",
            workspaceId,
          });
        }
        break;
      }

      case "transaction.payment_failed": {
        if (!workspaceId || !transactionId) {
          break;
        }

        const updated = await updatePaymentAttemptStatus(transactionId, "failed");

        if (!updated) {
          await recordPaymentAttempt({
            amount: matchedAttempt?.amount ?? 0,
            currency: matchedAttempt?.currency ?? "USD",
            plan: plan ?? "pro",
            provider: "paddle",
            providerPaymentId: transactionId,
            status: "failed",
            workspaceId,
          });
        }
        break;
      }

      default:
        console.warn("[Paddle Webhook] Unhandled event type.", {
          eventType,
        });
    }

    if (workspaceId) {
      await finalizeScheduledWorkspaceDeletionIfDue(workspaceId);
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
