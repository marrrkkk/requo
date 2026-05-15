import "server-only";

/**
 * Refund service.
 *
 * Encapsulates refund eligibility rules, refund record writes, and the
 * call into the billing provider's refund API. The provider is wired
 * through the abstraction in `@/lib/billing/providers` so this module
 * stays decoupled from any concrete payment processor.
 *
 * Consumers:
 *   - the refund API route (`app/api/billing/refund/route.ts`)
 *   - the Dodo webhook handler (`app/api/billing/dodo/webhook/route.ts`)
 *     which updates refund rows directly via Drizzle and then calls
 *     `applyApprovedRefundSideEffects` to cancel the subscription.
 *
 * Schema notes:
 *   - The `refunds` table no longer has a `paymentAttemptId` FK. The
 *     join key between a refund and a payment is `providerPaymentId`,
 *     which both `payment_attempts.providerPaymentId` and
 *     `refunds.providerPaymentId` carry.
 */

import { desc, eq, inArray } from "drizzle-orm";

import { getBillingProvider } from "@/lib/billing/providers";
import {
  cancelSubscription,
  getAccountSubscription,
} from "@/lib/billing/subscription-service";
import { db } from "@/lib/db/client";
import {
  paymentAttempts,
  refunds,
} from "@/lib/db/schema/subscriptions";

/** Refund window measured from the payment's `createdAt`. */
export const refundWindowDays = 30;

export type RefundRow = typeof refunds.$inferSelect;
export type PaymentAttemptRow = typeof paymentAttempts.$inferSelect;

export type RefundEligibleReason =
  | "not_found"
  | "not_yours"
  | "not_completed"
  | "outside_window"
  | "already_refunded"
  | "refund_in_progress";

export type RefundFailureReason =
  | RefundEligibleReason
  | "provider_error"
  | "internal_error";

export type RefundEligibility =
  | { eligible: true }
  | {
      eligible: false;
      reason: RefundEligibleReason;
      message: string;
    };

export type RequestRefundResult =
  | {
      ok: true;
      refund: RefundRow;
    }
  | {
      ok: false;
      reason: RefundFailureReason;
      message: string;
    };

function generateRefundId(): string {
  return `rfd_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Returns refunds that block a new refund request for a given payment.
 * Any existing refund row that is `pending` or `approved` blocks.
 */
async function getRefundsForPayment(
  providerPaymentId: string,
): Promise<RefundRow[]> {
  return db
    .select()
    .from(refunds)
    .where(eq(refunds.providerPaymentId, providerPaymentId));
}

/**
 * Fetches a payment attempt with access control. Returns the row only
 * if it belongs to the authenticated user.
 */
export async function getOwnedPaymentAttempt(
  paymentAttemptId: string,
  userId: string,
): Promise<PaymentAttemptRow | null> {
  const [row] = await db
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.id, paymentAttemptId))
    .limit(1);

  if (!row) {
    return null;
  }

  if (row.userId !== userId) {
    return null;
  }

  return row;
}

/**
 * Determines whether a given payment can be refunded by the owner.
 * Encapsulates every eligibility rule in one place.
 *
 * Rules:
 *   1. payment status must be `succeeded`
 *   2. payment must be within `refundWindowDays` of `createdAt`
 *   3. no existing refund row in `pending` or `approved` status for the
 *      same `providerPaymentId`
 *
 * Ownership is enforced by `getOwnedPaymentAttempt` upstream, not here.
 */
export async function checkRefundEligibility(
  payment: PaymentAttemptRow,
): Promise<RefundEligibility> {
  if (payment.status !== "succeeded") {
    return {
      eligible: false,
      reason: "not_completed",
      message: "Only completed payments can be refunded.",
    };
  }

  const windowMs = refundWindowDays * 24 * 60 * 60 * 1000;
  const paidAt = payment.createdAt.getTime();
  if (Date.now() - paidAt > windowMs) {
    return {
      eligible: false,
      reason: "outside_window",
      message: `Refund requests must be made within ${refundWindowDays} days of payment.`,
    };
  }

  const existing = await getRefundsForPayment(payment.providerPaymentId);
  const blocking = existing.find(
    (row) => row.status === "pending" || row.status === "approved",
  );

  if (blocking) {
    if (blocking.status === "approved") {
      return {
        eligible: false,
        reason: "already_refunded",
        message: "This payment has already been refunded.",
      };
    }
    return {
      eligible: false,
      reason: "refund_in_progress",
      message: "A refund for this payment is already in progress.",
    };
  }

  return { eligible: true };
}

/**
 * Requests a refund for a payment. Runs all eligibility checks, calls
 * the billing provider's refund API, and inserts a `pending` refund
 * row keyed by `providerRefundId` and `providerPaymentId`.
 *
 * Access control: the caller must have verified the user is
 * authenticated. Ownership is verified inside this function.
 */
export async function requestRefundForPayment(params: {
  paymentAttemptId: string;
  userId: string;
  reason: string;
}): Promise<RequestRefundResult> {
  const payment = await getOwnedPaymentAttempt(
    params.paymentAttemptId,
    params.userId,
  );

  if (!payment) {
    return {
      ok: false,
      reason: "not_yours",
      message: "Payment not found.",
    };
  }

  const eligibility = await checkRefundEligibility(payment);
  if (!eligibility.eligible) {
    return {
      ok: false,
      reason: eligibility.reason,
      message: eligibility.message,
    };
  }

  const trimmedReason = params.reason.slice(0, 500);

  const provider = getBillingProvider(payment.provider);
  const providerResult = await provider.requestRefund(
    payment.providerPaymentId,
    trimmedReason,
  );

  if (providerResult.type === "error") {
    return {
      ok: false,
      reason: "provider_error",
      message: providerResult.message,
    };
  }

  const now = new Date();

  try {
    const [inserted] = await db
      .insert(refunds)
      .values({
        id: generateRefundId(),
        userId: params.userId,
        provider: payment.provider,
        providerRefundId: providerResult.refundId,
        providerPaymentId: payment.providerPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: "pending",
        reason: trimmedReason,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inserted) {
      return {
        ok: false,
        reason: "internal_error",
        message: "Refund was initiated but could not be recorded.",
      };
    }

    return { ok: true, refund: inserted };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to record refund.";
    return {
      ok: false,
      reason: "internal_error",
      message,
    };
  }
}

/**
 * Side effects applied when a refund transitions to `approved`.
 *
 * Cancels the user's subscription so paid access ends at the current
 * billing period. This is intentionally conservative: we don't force
 * an immediate downgrade so that if the provider subsequently reverses
 * the refund, the user isn't needlessly locked out mid-cycle.
 *
 * Invoked by the webhook handler after it flips a refund row to
 * `approved`. Idempotent — re-running is a no-op when the user is
 * already canceled or on the free plan.
 */
export async function applyApprovedRefundSideEffects(
  userId: string,
): Promise<void> {
  const subscription = await getAccountSubscription(userId);
  if (!subscription) return;
  if (subscription.status === "free" || subscription.status === "canceled") {
    return;
  }

  await cancelSubscription(userId);
}

/**
 * Returns refunds for a user's payment history. Used by the UI.
 */
export async function listRefundsForUser(
  userId: string,
): Promise<RefundRow[]> {
  return db
    .select()
    .from(refunds)
    .where(eq(refunds.userId, userId))
    .orderBy(desc(refunds.createdAt));
}

/**
 * Returns refunds for a specific set of provider payment ids.
 * Replaces the previous `listRefundsForPaymentAttempts` helper now
 * that the `refunds` table joins to payments via `providerPaymentId`
 * rather than a `paymentAttemptId` FK.
 */
export async function listRefundsForPaymentIds(
  providerPaymentIds: readonly string[],
): Promise<RefundRow[]> {
  if (providerPaymentIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(refunds)
    .where(inArray(refunds.providerPaymentId, [...providerPaymentIds]));
}

/**
 * Builds a `paymentAttemptId → RefundRow` map for a set of payment
 * attempts. Convenience wrapper around `listRefundsForPaymentIds` for
 * UI callers that already hold the `paymentAttempts` rows and want to
 * key by attempt id rather than provider payment id.
 *
 * When multiple refund rows share a `providerPaymentId`, the mapping
 * prefers a non-failed refund so the UI surfaces the active refund
 * state instead of a stale failed attempt.
 */
export async function mapRefundsByPaymentAttempt(
  payments: readonly Pick<PaymentAttemptRow, "id" | "providerPaymentId">[],
): Promise<Map<string, RefundRow>> {
  if (payments.length === 0) {
    return new Map();
  }

  const providerPaymentIds = Array.from(
    new Set(
      payments
        .map((row) => row.providerPaymentId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (providerPaymentIds.length === 0) {
    return new Map();
  }

  const rows = await listRefundsForPaymentIds(providerPaymentIds);

  const byProviderPaymentId = new Map<string, RefundRow>();
  for (const row of rows) {
    const existing = byProviderPaymentId.get(row.providerPaymentId);
    if (
      !existing ||
      (existing.status === "failed" && row.status !== "failed")
    ) {
      byProviderPaymentId.set(row.providerPaymentId, row);
    }
  }

  const result = new Map<string, RefundRow>();
  for (const payment of payments) {
    const refund = byProviderPaymentId.get(payment.providerPaymentId);
    if (refund) {
      result.set(payment.id, refund);
    }
  }

  return result;
}
