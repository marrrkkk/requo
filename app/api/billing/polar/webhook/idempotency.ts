import "server-only";

/**
 * Idempotent webhook event wrapper for the Polar webhook route.
 *
 * Composes a stable `providerEventId` from the event type and the
 * payload's identifier, records the event in `billing_events`, and
 * routes the lifecycle of that row through the standard
 * `processing -> processed | failed` transitions.
 *
 * Behaviour summary (mirrors the design's `withIdempotency` shape
 * section, Requirements 5.3, 5.5, 6.1–6.5, 11.4):
 *
 *  1. `providerEventId = `${eventType}:${stableId}`` where `stableId`
 *     is `payload.id ?? payload.data.id ?? randomUUID()`.
 *  2. `recordWebhookEvent(...)` — duplicate deliveries short-circuit.
 *  3. `userId === null` -> mark `failed("User not found")` and return
 *     without throwing. Polar receives 200 and stops retrying an
 *     unfixable data problem.
 *  4. Run `handler(userId, eventId)`. Mark `processed` on success;
 *     mark `failed(error.message)` and re-throw on error so the
 *     adapter returns 5xx and Polar retries.
 */

import { randomUUID } from "node:crypto";

import {
  markEventFailed,
  markEventProcessed,
  recordWebhookEvent,
} from "@/lib/billing/webhook-processor";

type IdempotencyPayload = {
  id?: unknown;
  data?: { id?: unknown } | unknown;
};

type ResolveUserId<TPayload> = (
  payload: TPayload,
) => Promise<string | null> | string | null;

type IdempotencyHandler = (
  userId: string,
  eventId: string,
) => Promise<void>;

function readId(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function deriveStableId(payload: IdempotencyPayload): string {
  const topLevel = readId(payload.id);
  if (topLevel) return topLevel;

  const data = payload.data;
  if (data && typeof data === "object" && "id" in data) {
    const nested = readId((data as { id?: unknown }).id);
    if (nested) return nested;
  }

  return randomUUID();
}

/**
 * Wraps a Polar webhook handler with idempotent event recording.
 *
 * @param payload      The verified Polar webhook payload.
 * @param eventType    The Polar event type string (e.g. `subscription.active`).
 * @param resolveUserId Resolves the Requo `user.id` for this event, or
 *                     `null` when no user can be resolved.
 * @param handler      Per-event handler invoked with the resolved
 *                     `userId` and the `billing_events.id` row id.
 */
export async function withIdempotency<TPayload extends IdempotencyPayload>(
  payload: TPayload,
  eventType: string,
  resolveUserId: ResolveUserId<TPayload>,
  handler: IdempotencyHandler,
): Promise<void> {
  const stableId = deriveStableId(payload);
  const providerEventId = `${eventType}:${stableId}`;

  const userId = await resolveUserId(payload);

  const recordResult = await recordWebhookEvent({
    providerEventId,
    provider: "polar",
    eventType,
    userId,
    payload,
  });

  if (!recordResult.isNew) {
    // Duplicate delivery — already processed.
    return;
  }

  const eventId = recordResult.eventId;

  if (userId === null) {
    await markEventFailed(eventId, "User not found");
    return;
  }

  try {
    await handler(userId, eventId);
    await markEventProcessed(eventId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook error.";
    console.error("[polar webhook] processing error", message, { eventType });
    await markEventFailed(eventId, message);
    throw error;
  }
}
