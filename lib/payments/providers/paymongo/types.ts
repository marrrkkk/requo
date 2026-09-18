/** PayMongo v2 Hosted Checkout + v1 Payments/Refunds shapes (docs.paymongo.com). */

export type PayMongoCredentials = {
  secretKey: string;
  webhookSecret: string;
};

export type PayMongoLineItem = {
  name: string;
  amount: number;
  currency: string;
  quantity: number;
  description?: string;
};

export type PayMongoCheckoutAttributes = {
  checkout_url?: string;
  livemode?: boolean;
  line_items?: PayMongoLineItem[];
  payment_method_types?: string[];
  success_url?: string;
  cancel_url?: string;
  reference_number?: string;
  metadata?: Record<string, unknown>;
  pass_on_fees?: boolean;
  description?: string;
  status?: string;
  payment_intent?: { id?: string } | null;
  payments?: PayMongoPayment[];
  created_at?: number;
  updated_at?: number;
};

export type PayMongoCheckoutSession = {
  id: string;
  type: string;
  attributes: PayMongoCheckoutAttributes;
};

export type PayMongoRefundEntry = {
  id?: string;
  amount?: number;
  attributes?: { amount?: number; status?: string };
};

export type PayMongoPaymentAttributes = {
  amount?: number;
  currency?: string;
  status?: string;
  livemode?: boolean;
  paid_at?: number;
  created_at?: number;
  updated_at?: number;
  payment_intent_id?: string;
  checkout_session_id?: string;
  metadata?: Record<string, unknown>;
  refunds?: PayMongoRefundEntry[];
};

export type PayMongoPayment = {
  id: string;
  type?: string;
  attributes: PayMongoPaymentAttributes;
};

export type PayMongoRefundAttributes = {
  amount?: number;
  payment_id?: string;
  reason?: string;
  status?: string;
  livemode?: boolean;
};

export type PayMongoRefund = {
  id: string;
  type?: string;
  attributes: PayMongoRefundAttributes;
};

/** v2 webhook envelope: `{ data: { id, type, resource, livemode, attributes } }`. */
export type PayMongoWebhookEnvelope = {
  event_type?: string;
  data?: {
    id?: string;
    type?: string;
    resource?: string;
    livemode?: boolean;
    organization_id?: string;
    created_at?: string;
    updated_at?: string;
    attributes?: Record<string, unknown>;
  };
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
