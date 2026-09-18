/** Stripe Checkout / PaymentIntent / Charge / Refund shapes (docs.stripe.com). */

export type StripeCredentials = {
  secretKey: string;
  webhookSecret: string;
};

export type StripeCharge = {
  id: string;
  amount?: number;
  amount_refunded?: number;
  currency?: string;
  payment_intent?: string | { id?: string } | null;
};

export type StripePaymentIntent = {
  id: string;
  object?: string;
  status?: string;
  amount?: number;
  currency?: string;
  created?: number;
  livemode?: boolean;
  metadata?: Record<string, unknown>;
  charges?: { data?: StripeCharge[] };
  latest_charge?: string | StripeCharge | null;
};

export type StripeCheckoutSession = {
  id: string;
  object?: string;
  status?: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  created?: number;
  livemode?: boolean;
  metadata?: Record<string, unknown>;
  payment_intent?: string | StripePaymentIntent | null;
  success_url?: string;
  cancel_url?: string;
  url?: string | null;
};

export type StripeRefund = {
  id: string;
  object?: string;
  amount?: number;
  payment_intent?: string | null;
  status?: string;
};

export type StripeWebhookEvent = {
  id?: string;
  type?: string;
  livemode?: boolean;
  created?: number;
  data?: { object?: Record<string, unknown> };
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function unixToDate(value: unknown): Date | undefined {
  const n = asNumber(value);
  if (n === undefined) return undefined;
  const date = new Date(n * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function paymentIntentId(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  const record = asRecord(value);
  return asString(record.id);
}

export function chargePaymentIntentId(charge: StripeCharge): string | undefined {
  return paymentIntentId(charge.payment_intent);
}

export function sumRefunded(charges: StripeCharge[] | undefined): number {
  if (!Array.isArray(charges)) return 0;
  return charges.reduce((sum, charge) => sum + Math.max(0, asNumber(charge.amount_refunded) ?? 0), 0);
}
