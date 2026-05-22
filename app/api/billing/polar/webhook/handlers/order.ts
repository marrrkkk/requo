import "server-only";

/**
 * Polar order webhook handlers.
 *
 * Handles `order.paid`, `order.updated`, and `order.refunded` events.
 * Polar orders represent a single paid charge — the initial purchase
 * or a recurring renewal — and are mirrored to `payment_attempts`
 * rows for billing-history UI, audit, and refund eligibility checks.
 *
 * Behaviour summary (Requirements 8.1–8.5):
 *
 *   - `order.paid`     -> insert a `succeeded` `payment_attempts` row
 *                        keyed by `data.id` and the order amount.
 *   - `order.updated`  -> insert a `failed` row only when the order
 *                        transitions into a failed status. Polar's
 *                        `OrderStatus` does not model `failed`
 *                        directly; the closest analog is `void`,
 *                        which we treat as the failed transition.
 *                        `refunded` / `partially_refunded` transitions
 *                        are no-ops here — the refund handler in
 *                        `./refund.ts` owns the refund lifecycle.
 *   - `order.refunded` -> recorded in `billing_events` with status
 *                        `ignored`. Refund lifecycle is owned by
 *                        `refund.*` events.
 *
 * Identity resolution follows the standard chain via
 * `resolvePolarUserId`: `customer.external_id` → providerCustomerId
 * lookup → providerSubscriptionId lookup → `metadata.userId`.
 * When no source resolves, the handler still inserts a
 * `payment_attempts` row with `userId = null` (Requirement 8.4) and
 * marks the `billing_events` row `failed` for operator follow-up.
 *
 * Order events DO NOT mutate subscription state. Subscription state
 * is owned exclusively by `subscription.*` events (Requirement 8.5).
 *
 * Idempotency: the `withIdempotency` helper short-circuits with
 * `markEventFailed` whenever `userId === null`, which conflicts with
 * Requirement 8.4 (the `payment_attempts` row must still be inserted
 * for unresolvable users). These handlers therefore call
 * `recordWebhookEvent` / `markEventProcessed` / `markEventFailed`
 * directly so the unresolvable-user path can record the payment row
 * before flagging the event as failed.
 */

import { randomUUID } from "node:crypto";
import type { WebhookOrderPaidPayload } from "@polar-sh/sdk/models/components/webhookorderpaidpayload";
import type { WebhookOrderUpdatedPayload } from "@polar-sh/sdk/models/components/webhookorderupdatedpayload";
import type { WebhookOrderRefundedPayload } from "@polar-sh/sdk/models/components/webhookorderrefundedpayload";
import type { Order } from "@polar-sh/sdk/models/components/order";

import {
  getAccountSubscription,
} from "@/lib/billing/subscription-service";
import {
  markEventFailed,
  markEventIgnored,
  markEventProcessed,
  recordPaymentAttempt,
  recordWebhookEvent,
} from "@/lib/billing/webhook-processor";
import type { BillingCurrency } from "@/lib/db/schema/subscriptions";

import { resolvePolarUserId, type PolarEventPayload } from "../identity";

type OrderPayload =
  | WebhookOrderPaidPayload
  | WebhookOrderUpdatedPayload
  | WebhookOrderRefundedPayload;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Maps a Polar order currency string to the Requo `BillingCurrency`
 * enum. Polar settles in USD; we accept `PHP` defensively for
 * forward-compatibility and default to `USD` for anything else.
 */
function readCurrency(value: string | null | undefined): BillingCurrency {
  return value === "PHP" ? "PHP" : "USD";
}

/**
 * Reads a string-typed `plan` from the Polar order metadata, if any.
 * Polar's metadata values can be `string | number | boolean`, so we
 * narrow defensively.
 */
function readPlanFromMetadata(order: Order): string | null {
  const metadata = order.metadata as
    | Record<string, string | number | boolean | undefined>
    | undefined;
  const plan = metadata?.plan;
  return typeof plan === "string" && plan.length > 0 ? plan : null;
}

/**
 * Resolves the plan to record on the `payment_attempts` row.
 *
 * Lookup order (Requirement 8.4 implies the row must always be
 * insertable, even with no resolved user):
 *
 *   1. `data.metadata.plan` — set during checkout-session creation.
 *   2. The user's existing `account_subscriptions.plan` — useful for
 *      recurring renewals where metadata may be absent.
 *   3. Fallback to `"pro"` — orders represent paid charges, and the
 *      `payment_attempts.plan` column is `notNull`. `"free"` is not
 *      a paid plan, so we choose `"pro"` as the safest default.
 */
async function resolvePlan(
  order: Order,
  userId: string | null,
): Promise<string> {
  const fromMetadata = readPlanFromMetadata(order);
  if (fromMetadata) return fromMetadata;

  if (userId) {
    const subscription = await getAccountSubscription(userId);
    if (subscription?.plan && subscription.plan.length > 0) {
      return subscription.plan;
    }
  }

  return "pro";
}

/**
 * Adapts a Polar SDK payload (camelCase, typed) to the structurally-
 * typed shape `resolvePolarUserId` accepts (snake_case keys). The
 * resolver was originally written against the raw Standard-Webhooks
 * payload shape; this keeps that behaviour intact while letting the
 * handlers consume the SDK's typed payloads directly.
 */
function toResolverPayload(payload: OrderPayload): PolarEventPayload {
  const data = payload.data;
  const customer = data.customer;
  const metadata = data.metadata as
    | Record<string, string | number | boolean | undefined>
    | undefined;
  const metadataUserId = metadata?.userId;

  return {
    type: payload.type,
    data: {
      id: data.id,
      subscription_id: data.subscriptionId ?? null,
      customer: {
        id: customer.id,
        external_id: customer.externalId ?? null,
      },
      metadata: {
        userId:
          typeof metadataUserId === "string" && metadataUserId.length > 0
            ? metadataUserId
            : null,
      },
    },
  };
}

/**
 * Builds the stable provider event id used for idempotent dedup.
 * Mirrors the composition rule used by `withIdempotency`:
 *   `${eventType}:${payload.id ?? payload.data.id ?? randomUUID()}`.
 *
 * The Polar Order webhook payload type does not carry a top-level
 * `id` field; we always fall back to `data.id` (the Polar order id),
 * which uniquely identifies the underlying object. The event-type
 * prefix prevents collisions between, e.g., `order.paid` and
 * `order.updated` for the same order id.
 */
function buildProviderEventId(payload: OrderPayload): string {
  const stable = payload.data?.id ?? randomUUID();
  return `${payload.type}:${stable}`;
}

/* ── Order event implementation ───────────────────────────────────────────── */

/**
 * Records a `payment_attempts` row for the given order outcome.
 * Accepts a nullable userId so unresolvable orders still produce a
 * row for later operator reconciliation (Requirement 8.4).
 */
async function recordOrderPaymentAttempt(params: {
  order: Order;
  userId: string | null;
  status: "succeeded" | "failed";
}): Promise<void> {
  const { order, userId, status } = params;
  const plan = await resolvePlan(order, userId);

  await recordPaymentAttempt({
    userId,
    plan,
    provider: "polar",
    providerPaymentId: order.id,
    // Polar order amounts are denominated in cents. `totalAmount`
    // includes discounts and taxes — the same end-customer-charged
    // amount we want to display in billing history.
    amount: order.totalAmount,
    currency: readCurrency(order.currency),
    status,
  });
}

/**
 * Detects whether an `order.updated` event represents a failed
 * collection attempt that warrants a `failed` `payment_attempts`
 * row. Polar's `OrderStatus` does not model `failed`; the closest
 * analog is `void` (an order that could not be collected). Refunded
 * transitions are explicitly excluded — those are handled by
 * `refund.*` events via `./refund.ts`.
 */
function isFailedOrderTransition(order: Order): boolean {
  // `OrderStatus` is an `OpenEnum`, so it can carry an
  // `Unrecognized<string>` value. Narrow loosely.
  const status = String(order.status);
  return status === "void";
}

/**
 * Wraps an order handler with idempotent event recording. Used in
 * place of `withIdempotency` because Requirement 8.4 mandates
 * inserting a `payment_attempts` row even when the user can't be
 * resolved — `withIdempotency` short-circuits before running the
 * handler in that case.
 */
async function processOrderEvent(params: {
  payload: OrderPayload;
  handler: (userId: string | null, eventId: string) => Promise<void>;
}): Promise<void> {
  const { payload, handler } = params;
  const providerEventId = buildProviderEventId(payload);
  const userId = await resolvePolarUserId(toResolverPayload(payload));

  const recordResult = await recordWebhookEvent({
    providerEventId,
    provider: "polar",
    eventType: payload.type,
    userId,
    payload,
  });

  if (!recordResult.isNew) {
    // Duplicate delivery — already processed.
    return;
  }

  const eventId = recordResult.eventId;

  try {
    await handler(userId, eventId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook error.";
    console.error("[polar webhook] order processing error", message, {
      eventType: payload.type,
    });
    await markEventFailed(eventId, message);
    throw error;
  }

  if (userId === null) {
    // Row inserted (if applicable), but no Requo user could be
    // resolved. Flag for operator follow-up per Requirement 8.4.
    await markEventFailed(eventId, "User not found");
    return;
  }

  await markEventProcessed(eventId);
}

/* ── Exported handlers ────────────────────────────────────────────────────── */

/**
 * `order.paid` — insert a `succeeded` `payment_attempts` row.
 * Subscription state is not mutated here; subscription lifecycle
 * is owned by `subscription.*` events (Requirement 8.5).
 */
export async function handleOrderPaid(
  payload: WebhookOrderPaidPayload,
): Promise<void> {
  await processOrderEvent({
    payload,
    handler: async (userId) => {
      await recordOrderPaymentAttempt({
        order: payload.data,
        userId,
        status: "succeeded",
      });
    },
  });
}

/**
 * `order.updated` — insert a `failed` `payment_attempts` row only
 * when the order transitions into a failed status (Polar `void`).
 * Refunded / partially-refunded transitions are no-ops here.
 */
export async function handleOrderUpdated(
  payload: WebhookOrderUpdatedPayload,
): Promise<void> {
  await processOrderEvent({
    payload,
    handler: async (userId) => {
      if (!isFailedOrderTransition(payload.data)) {
        return;
      }
      await recordOrderPaymentAttempt({
        order: payload.data,
        userId,
        status: "failed",
      });
    },
  });
}

/**
 * `order.refunded` — refunds are owned by `refund.*` events
 * (Requirement 10.5). We record the event in `billing_events` with
 * status `ignored` for traceability and do not touch
 * `payment_attempts`.
 */
export async function handleOrderRefunded(
  payload: WebhookOrderRefundedPayload,
): Promise<void> {
  const providerEventId = buildProviderEventId(payload);
  const userId = await resolvePolarUserId(toResolverPayload(payload));

  const recordResult = await recordWebhookEvent({
    providerEventId,
    provider: "polar",
    eventType: payload.type,
    userId,
    payload,
  });

  if (!recordResult.isNew) {
    return;
  }

  await markEventIgnored(recordResult.eventId);
}
