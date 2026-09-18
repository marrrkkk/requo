import type { PaymentStatus } from "@/lib/payments/types";

const TERMINAL: ReadonlySet<PaymentStatus> = new Set([
  "failed",
  "canceled",
  "refunded",
]);

const SUCCEEDED_FAMILY: ReadonlySet<PaymentStatus> = new Set([
  "succeeded",
  "partially_refunded",
  "refunded",
]);

const FORWARD: Record<PaymentStatus, ReadonlySet<PaymentStatus>> = {
  pending: new Set(["processing", "succeeded", "failed", "canceled"]),
  processing: new Set(["succeeded", "failed", "canceled"]),
  succeeded: new Set(["partially_refunded", "refunded"]),
  partially_refunded: new Set(["refunded"]),
  failed: new Set([]),
  canceled: new Set([]),
  refunded: new Set([]),
};

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL.has(status);
}

export function isSucceededFamilyStatus(status: PaymentStatus): boolean {
  return SUCCEEDED_FAMILY.has(status);
}

/** Same-state repeats are always allowed (idempotent redelivery). */
export function isValidPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) return true;
  return FORWARD[from]?.has(to) ?? false;
}

export function deriveEffectiveStatus(
  base: PaymentStatus,
  amountInCents: number,
  refundedAmountInCents: number,
): PaymentStatus {
  if (!isSucceededFamilyStatus(base)) return base;
  if (refundedAmountInCents <= 0) return "succeeded";
  if (refundedAmountInCents >= amountInCents) return "refunded";
  return "partially_refunded";
}

export function clampRefundedAmount(
  amountInCents: number,
  refundedAmountInCents: number,
): number {
  if (!Number.isSafeInteger(refundedAmountInCents)) return 0;
  return Math.min(Math.max(0, refundedAmountInCents), Math.max(0, amountInCents));
}
