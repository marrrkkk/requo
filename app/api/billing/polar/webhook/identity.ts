import "server-only";

/**
 * Identity resolution for Polar webhook events.
 *
 * Polar webhooks may carry the originating Requo user id in several
 * places depending on how the underlying object was created. This
 * resolver follows the priority chain documented in the design:
 *
 *   1. `data.customer.external_id` — set to `user.id` at checkout.
 *   2. `data.customer.id` looked up against `account_subscriptions.providerCustomerId`.
 *   3. `data.subscription_id` (or `data.id` for `subscription.*` events)
 *      looked up against `account_subscriptions.providerSubscriptionId`.
 *   4. `data.metadata.userId` (legacy fallback for older sessions).
 *
 * Returns `null` when no source resolves; the caller is expected to
 * record the event in `billing_events` with `userId = null` and status
 * `failed` so the issue is visible for operator follow-up.
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { accountSubscriptions } from "@/lib/db/schema/subscriptions";

/**
 * Permissive shape capturing only the fields the resolver reads.
 *
 * Polar's SDK ships per-event union types (`WebhookSubscriptionCreatedPayload`,
 * `WebhookOrderPaidPayload`, etc.). Rather than thread that union here, we
 * accept a structurally-typed superset so the resolver stays resilient to
 * missing fields and forward-compatible with new event variants.
 */
export type PolarEventPayload = {
  type: string;
  data?: {
    id?: string | null;
    subscription_id?: string | null;
    customer?: {
      id?: string | null;
      external_id?: string | null;
    } | null;
    metadata?: {
      userId?: unknown;
    } | null;
  } | null;
};

/**
 * `subscription.*` events store the subscription id at `data.id`. For all
 * other event families we only fall back to `data.subscription_id`. This
 * predicate keeps the `providerSubscriptionId` lookup correctly scoped.
 */
export function eventTypeIsSubscription(type: string): boolean {
  return typeof type === "string" && type.startsWith("subscription.");
}

/**
 * Resolves the Requo `user.id` for a Polar webhook payload.
 *
 * Returns `null` when no identity source resolves.
 */
export async function resolvePolarUserId(
  payload: PolarEventPayload,
): Promise<string | null> {
  const externalId = payload.data?.customer?.external_id ?? null;
  if (typeof externalId === "string" && externalId.length > 0) {
    return externalId;
  }

  const customerId = payload.data?.customer?.id ?? null;
  if (typeof customerId === "string" && customerId.length > 0) {
    const [row] = await db
      .select({ userId: accountSubscriptions.userId })
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.providerCustomerId, customerId))
      .limit(1);
    if (row) return row.userId;
  }

  const subId = payload.data?.subscription_id ?? payload.data?.id ?? null;
  if (
    typeof subId === "string" &&
    subId.length > 0 &&
    eventTypeIsSubscription(payload.type)
  ) {
    const [row] = await db
      .select({ userId: accountSubscriptions.userId })
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.providerSubscriptionId, subId))
      .limit(1);
    if (row) return row.userId;
  }

  const metadataUserId = payload.data?.metadata?.userId ?? null;
  if (typeof metadataUserId === "string" && metadataUserId.length > 0) {
    return metadataUserId;
  }

  return null;
}
