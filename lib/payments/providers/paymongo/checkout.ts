import "server-only";

import type { ProviderPaymentSnapshot } from "@/lib/payments/types";
import { paymongoRequest, type PayMongoFetch } from "@/lib/payments/providers/paymongo/client";
import {
  asNumber,
  asRecord,
  asString,
  unixToDate,
  type PayMongoCheckoutSession,
  type PayMongoCredentials,
  type PayMongoPayment,
} from "@/lib/payments/providers/paymongo/types";

/** Payment method types from PayMongo's hosted-checkout examples. */
const DEFAULT_PAYMENT_METHOD_TYPES = ["card", "gcash", "qrph"];

export async function createPaymongoCheckout(input: {
  secretKey: string;
  amountInCents: number;
  currency: string;
  invoiceNumber: string;
  invoiceTitle: string;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  metadata: Record<string, string>;
  fetchImpl?: PayMongoFetch;
}): Promise<{ checkoutUrl: string; providerCheckoutId: string; livemode: boolean }> {
  const body = {
    data: {
      attributes: {
        line_items: [
          {
            name: input.invoiceTitle.slice(0, 200) || `Invoice ${input.invoiceNumber}`,
            amount: input.amountInCents,
            currency: input.currency.toUpperCase(),
            quantity: 1,
            description: `Requo invoice ${input.invoiceNumber}`,
          },
        ],
        payment_method_types: DEFAULT_PAYMENT_METHOD_TYPES,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        reference_number: input.invoiceNumber,
        metadata: input.metadata,
        pass_on_fees: false,
        description: `Requo invoice ${input.invoiceNumber}`,
        ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      },
    },
  };
  const response = await paymongoRequest<{ data: PayMongoCheckoutSession }>({
    secretKey: input.secretKey,
    method: "POST",
    path: "/v2/checkout_sessions",
    body,
    idempotencyKey: input.idempotencyKey,
    fetchImpl: input.fetchImpl,
  });
  const session = response.data;
  const checkoutUrl = asString(session?.attributes?.checkout_url);
  if (!asString(session?.id) || !checkoutUrl) throw new Error("PayMongo returned an unusable checkout session.");
  return { checkoutUrl, providerCheckoutId: session.id, livemode: session.attributes?.livemode === true };
}

function paymentToSnapshot(
  payment: PayMongoPayment,
  checkoutId?: string,
  fallbackMeta?: Record<string, unknown>,
): ProviderPaymentSnapshot {
  const attributes = payment.attributes ?? {};
  const refunds = Array.isArray(attributes.refunds) ? attributes.refunds : [];
  const refunded = refunds.reduce((sum, entry) => {
    const record = entry !== null && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const amount =
      typeof record.amount === "number"
        ? record.amount
        : typeof (record.attributes as Record<string, unknown> | undefined)?.amount === "number"
          ? ((record.attributes as Record<string, unknown>).amount as number)
          : 0;
    return sum + Math.max(0, amount);
  }, 0);
  const meta = asRecord(attributes.metadata ?? fallbackMeta);
  return {
    provider: "paymongo",
    environment: attributes.livemode === true ? "live" : "test",
    providerCheckoutId: asString(attributes.checkout_session_id) ?? checkoutId,
    providerPaymentId: payment.id,
    status: attributes.status === "paid" ? "succeeded" : attributes.status === "failed" ? "failed" : "processing",
    amountInCents: asNumber(attributes.amount) ?? 0,
    refundedAmountInCents: refunded,
    currency: (asString(attributes.currency) ?? "PHP").toUpperCase(),
    invoiceId: asString(meta.requoInvoiceId),
    businessId: asString(meta.requoBusinessId),
    connectionId: asString(meta.requoConnectionId),
    occurredAt: unixToDate(attributes.paid_at) ?? unixToDate(attributes.updated_at) ?? unixToDate(attributes.created_at),
  };
}

export async function retrievePaymongoSession(input: {
  secretKey: string;
  checkoutId: string;
  fetchImpl?: PayMongoFetch;
}): Promise<ProviderPaymentSnapshot> {
  const response = await paymongoRequest<{ data: PayMongoCheckoutSession }>({
    secretKey: input.secretKey,
    method: "GET",
    path: `/v1/checkout_sessions/${encodeURIComponent(input.checkoutId)}`,
    fetchImpl: input.fetchImpl,
  });
  const session = response.data;
  const attributes = session?.attributes ?? {};
  const meta = asRecord(attributes.metadata);
  const environment = attributes.livemode === true ? "live" : "test";
  const payments = Array.isArray(attributes.payments) ? attributes.payments : [];
  const paid = payments.find((p) => asRecord(p.attributes).status === "paid");
  if (paid && asString(paid.id)) {
    const snapshot = paymentToSnapshot(paid, session?.id, meta);
    snapshot.environment = environment;
    return snapshot;
  }
  const lineItems = Array.isArray(attributes.line_items) ? attributes.line_items : [];
  const amount = lineItems.reduce(
    (sum, item) => sum + (asNumber(item.amount) ?? 0) * (asNumber(item.quantity) ?? 1),
    0,
  );
  const currency = (asString(lineItems[0]?.currency) ?? "PHP").toUpperCase();
  return {
    provider: "paymongo",
    environment,
    providerCheckoutId: asString(session?.id) ?? input.checkoutId,
    status: attributes.status === "expired" ? "canceled" : "pending",
    amountInCents: amount,
    refundedAmountInCents: 0,
    currency,
    invoiceId: asString(meta.requoInvoiceId),
    businessId: asString(meta.requoBusinessId),
    connectionId: asString(meta.requoConnectionId),
    occurredAt: unixToDate(attributes.updated_at) ?? unixToDate(attributes.created_at),
  };
}

export async function retrievePaymongoPayment(input: {
  secretKey: string;
  paymentId: string;
  fetchImpl?: PayMongoFetch;
}): Promise<ProviderPaymentSnapshot> {
  const response = await paymongoRequest<{ data: PayMongoPayment }>({
    secretKey: input.secretKey,
    method: "GET",
    path: `/v1/payments/${encodeURIComponent(input.paymentId)}`,
    fetchImpl: input.fetchImpl,
  });
  if (!asString(response.data?.id)) throw new Error("PayMongo payment not found.");
  return paymentToSnapshot(response.data);
}

export function credentialsFromRecord(credentials: Record<string, string>): PayMongoCredentials {
  return { secretKey: credentials.secretKey ?? "", webhookSecret: credentials.webhookSecret ?? "" };
}
