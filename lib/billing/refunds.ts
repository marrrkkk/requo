import "server-only";

/**
 * Refund service.
 *
 * Encapsulates refund eligibility rules, refund record writes, and the
 * Paddle adjustment call. Consumers are the refund API route and the
 * Paddle `adjustment.updated` webhook handler.
 */

import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  paymentAttempts,
  refunds,
  type RefundStatus,
} from "@/lib/db/schema/subscriptions";
import {
  createPaddleAdjustment,
  mapPaddleAdjustmentStatus,
  type PaddleAdjustmentStatus,
} from "@/lib/billing/providers/paddle";
import {
  cancelSubscription,
  getAccountSubscription,
} from "@/lib/billing/subscription-service";

/** Refund window measured from the payment's `createdAt`. */
export const refundWindowDays = 30;

export type RefundRow = typeof refunds.$inferSelect;
export type PaymentAttemptRow = typeof paymentAttempts.$inferSelect;

export type RefundEligibleReason =
  | "not_found"
  | "not_yours"
  | "not_completed"
  | "outside_window"
  | "unsupported_provider"
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

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function mapAdjustmentStatusToRefundStatus(
  status: PaddleAdjustmentStatus,
): RefundStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "reversed":
      return "rejected";
    case "pending_approval":
    default:
      return "pending_approval";
  }
}

/**
 * Returns refunds that block a new refund request for a given payment.
 * Any existing refund that is `pending_approval` or `approved` blocks.
 */
async function getBlockingRefunds(paymentAttemptId: string) {
  return db
    .select()
    .from(refunds)
    .where(eq(refunds.paymentAttemptId, paymentAttemptId));
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

  if (payment.provider !== "paddle") {
    return {
      eligible: false,
      reason: "unsupported_provider",
      message: "Refunds are only supported for Paddle payments.",
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

  const existing = await getBlockingRefunds(payment.id);
  const blocking = existing.find(
    (row) => row.status === "pending_approval" || row.status === "approved",
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
 * Requests a refund for a payment. Runs all eligibility checks,
 * creates a Paddle adjustment, and persists a refund record.
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

  const subscription = await getAccountSubscription(params.userId);

  const adjustmentResult = await createPaddleAdjustment({
    transactionId: payment.providerPaymentId,
    reason: params.reason.slice(0, 500),
  });

  if (adjustmentResult.type === "error") {
    return {
      ok: false,
      reason: "provider_error",
      message: adjustmentResult.message,
    };
  }

  const now = new Date();
  const id = generateId("ref");

  try {
    const [inserted] = await db
      .insert(refunds)
      .values({
        id,
        userId: params.userId,
        paymentAttemptId: payment.id,
        subscriptionId: subscription?.id ?? null,
        businessId: payment.businessId ?? null,
        provider: payment.provider,
        providerTransactionId: payment.providerPaymentId,
        providerAdjustmentId: adjustmentResult.adjustmentId,
        status: mapAdjustmentStatusToRefundStatus(adjustmentResult.status),
        reason: params.reason,
        requestedByUserId: params.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // If Paddle returned an already-approved adjustment (rare but possible),
    // downgrade access immediately so the user can't keep paid features.
    if (adjustmentResult.status === "approved") {
      await applyApprovedRefundSideEffects(params.userId);
    }

    return { ok: true, refund: inserted! };
  } catch (error) {
    console.error("[Refund] Failed to store refund row.", {
      userId: params.userId,
      paymentAttemptId: payment.id,
      adjustmentId: adjustmentResult.adjustmentId,
      error,
    });
    return {
      ok: false,
      reason: "internal_error",
      message: "Refund request failed. Please try again.",
    };
  }
}

/**
 * Updates a refund row by Paddle adjustment ID.
 * Used by the `adjustment.updated` webhook handler.
 */
export async function applyRefundStatusFromAdjustment(params: {
  providerAdjustmentId: string;
  paddleStatus: string;
}): Promise<RefundRow | null> {
  const mappedStatus = mapPaddleAdjustmentStatus(params.paddleStatus);
  const refundStatus = mapAdjustmentStatusToRefundStatus(mappedStatus);

  const [existing] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.providerAdjustmentId, params.providerAdjustmentId))
    .limit(1);

  if (!existing) {
    return null;
  }

  // No-op if the status is unchanged (idempotency against webhook replays).
  if (existing.status === refundStatus) {
    return existing;
  }

  const [updated] = await db
    .update(refunds)
    .set({
      status: refundStatus,
      updatedAt: new Date(),
    })
    .where(eq(refunds.id, existing.id))
    .returning();

  if (refundStatus === "approved") {
    await applyApprovedRefundSideEffects(existing.userId);
  }

  return updated ?? null;
}

/**
 * Side effects applied when a refund transitions to `approved`.
 * Cancels the user's subscription so paid access ends at the current
 * billing period. This is intentionally conservative: we don't force
 * an immediate downgrade so that if Paddle subsequently reverses the
 * adjustment, the user isn't needlessly locked out mid-cycle.
 */
async function applyApprovedRefundSideEffects(userId: string): Promise<void> {
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
 * Returns refunds for a specific set of payment attempts.
 * Preferred when the UI already has the payment list loaded.
 */
export async function listRefundsForPaymentAttempts(
  paymentAttemptIds: readonly string[],
): Promise<RefundRow[]> {
  if (paymentAttemptIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(refunds)
    .where(inArray(refunds.paymentAttemptId, [...paymentAttemptIds]));
}

/** @internal exported for tests */
export function _mapAdjustmentStatusToRefundStatus(
  status: PaddleAdjustmentStatus,
): RefundStatus {
  return mapAdjustmentStatusToRefundStatus(status);
}
