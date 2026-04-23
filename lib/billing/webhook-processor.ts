import "server-only";

/**
 * Idempotent webhook event processor.
 *
 * Every incoming provider webhook event is recorded in `billing_events`
 * before processing. Events with a duplicate `providerEventId` are
 * silently skipped to prevent double-processing on retries.
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  billingEvents,
  type BillingProvider,
} from "@/lib/db/schema/subscriptions";
import { paymentAttempts } from "@/lib/db/schema/subscriptions";
import type { WebhookProcessResult } from "@/lib/billing/types";

/* ── Event recording ──────────────────────────────────────────────────────── */

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Records a webhook event and returns whether it should be processed.
 * Returns `false` if the event has already been recorded (duplicate).
 */
export async function recordWebhookEvent(params: {
  providerEventId: string;
  provider: BillingProvider;
  eventType: string;
  workspaceId?: string | null;
  payload: unknown;
}): Promise<{ isNew: boolean; eventId: string }> {
  // Check for existing event
  const [existing] = await db
    .select({ id: billingEvents.id })
    .from(billingEvents)
    .where(eq(billingEvents.providerEventId, params.providerEventId))
    .limit(1);

  if (existing) {
    return { isNew: false, eventId: existing.id };
  }

  const eventId = generateId("evt");

  await db.insert(billingEvents).values({
    id: eventId,
    providerEventId: params.providerEventId,
    provider: params.provider,
    eventType: params.eventType,
    workspaceId: params.workspaceId ?? null,
    payload: params.payload as Record<string, unknown>,
    createdAt: new Date(),
  });

  return { isNew: true, eventId };
}

/**
 * Marks a webhook event as processed.
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  await db
    .update(billingEvents)
    .set({ processedAt: new Date() })
    .where(eq(billingEvents.id, eventId));
}

/* ── Payment attempt recording ────────────────────────────────────────────── */

type RecordPaymentAttemptParams = {
  workspaceId: string;
  plan: string;
  provider: BillingProvider;
  providerPaymentId: string;
  amount: number;
  currency: "PHP" | "USD";
  status: "pending" | "succeeded" | "failed" | "expired";
};

/**
 * Records a payment attempt for audit purposes.
 */
export async function recordPaymentAttempt(
  params: RecordPaymentAttemptParams,
): Promise<string> {
  const id = generateId("pay");

  await db.insert(paymentAttempts).values({
    id,
    workspaceId: params.workspaceId,
    plan: params.plan,
    provider: params.provider,
    providerPaymentId: params.providerPaymentId,
    amount: params.amount,
    currency: params.currency,
    status: params.status,
    createdAt: new Date(),
  });

  return id;
}

/**
 * Updates a payment attempt status.
 */
export async function updatePaymentAttemptStatus(
  providerPaymentId: string,
  status: "pending" | "succeeded" | "failed" | "expired",
): Promise<boolean> {
  const updated = await db
    .update(paymentAttempts)
    .set({ status })
    .where(eq(paymentAttempts.providerPaymentId, providerPaymentId))
    .returning({ id: paymentAttempts.id });

  return updated.length > 0;
}

/**
 * Standard webhook response helper.
 */
export function webhookSuccess(
  message: string,
  workspaceId?: string,
): WebhookProcessResult {
  return { success: true, message, workspaceId };
}

export function webhookError(message: string): WebhookProcessResult {
  return { success: false, message };
}
