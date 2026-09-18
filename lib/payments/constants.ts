/** Shared webhook + reconciliation constants (Q17, Q19). */

export const PAYMENT_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;

export const PAYMENT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export const PAYMENT_EVENT_STALE_AFTER_MINUTES = 15;

/** Provider rows in these states count toward the invoice net paid. */
export const COUNTED_PROVIDER_STATUSES = [
  "succeeded",
  "partially_refunded",
  "refunded",
] as const;
