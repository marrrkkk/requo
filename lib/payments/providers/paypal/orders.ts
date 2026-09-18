import "server-only";

import type { ProviderPaymentSnapshot } from "@/lib/payments/types";
import { paypalRequest, type PayPalFetch } from "@/lib/payments/providers/paypal/client";
import {
  asString,
  centsToPaypalValue,
  parsePaypalDate,
  paypalToCents,
  type PayPalCapture,
  type PayPalCredentials,
  type PayPalOrder,
} from "@/lib/payments/providers/paypal/types";

export async function createPaypalOrder(input: {
  credentials: PayPalCredentials;
  environment: "test" | "live";
  amountInCents: number;
  currency: string;
  invoiceNumber: string;
  invoiceTitle: string;
  requoInvoiceId: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  fetchImpl?: PayPalFetch;
}): Promise<{ checkoutUrl: string; providerCheckoutId: string }> {
  const currency = input.currency.toUpperCase();
  const order = await paypalRequest<PayPalOrder>({
    clientId: input.credentials.clientId,
    clientSecret: input.credentials.clientSecret,
    environment: input.environment,
    method: "POST",
    path: "/v2/checkout/orders",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.invoiceNumber.slice(0, 256),
          description: (input.invoiceTitle || `Invoice ${input.invoiceNumber}`).slice(0, 127),
          custom_id: input.requoInvoiceId.slice(0, 127),
          invoice_id: input.invoiceNumber.slice(0, 127),
          amount: { currency_code: currency, value: centsToPaypalValue(input.amountInCents, currency) },
        },
      ],
      application_context: {
        return_url: input.successUrl,
        cancel_url: input.cancelUrl,
        brand_name: "Requo".slice(0, 127),
        user_action: "PAY_NOW",
      },
    },
    requestId: input.idempotencyKey,
    fetchImpl: input.fetchImpl,
  });
  const approveUrl = order.links?.find((link) => link.rel === "approve" || link.rel === "payer-action")?.href;
  if (!asString(order?.id) || !asString(approveUrl))
    throw new Error("PayPal returned an unusable order.");
  return { checkoutUrl: approveUrl as string, providerCheckoutId: order.id as string };
}

function captureToSnapshot(
  capture: PayPalCapture,
  orderId: string | undefined,
  meta: { invoiceId?: string; businessId?: string; connectionId?: string },
): ProviderPaymentSnapshot {
  const currency = (asString(capture.amount?.currency_code) ?? "USD").toUpperCase();
  const amount = paypalToCents(capture.amount?.value, currency) ?? 0;
  const status = capture.status;
  const refundStatuses = new Set(["REFUNDED", "PARTIALLY_REFUNDED", "REVERSED"]);
  return {
    provider: "paypal",
    environment: "test",
    providerCheckoutId: orderId,
    providerPaymentId: capture.id,
    status:
      status === "COMPLETED"
        ? "succeeded"
        : status === "PENDING"
          ? "processing"
          : status === "DECLINED" || status === "DENIED" || status === "FAILED"
            ? "failed"
            : refundStatuses.has(status ?? "")
              ? "succeeded"
              : "processing",
    amountInCents: amount,
    // Webhook/refresh capture payloads carry no cumulative refund total;
    // individual refunds arrive as REFUNDED events (see parse). A fully
    // refunded/reversed capture unambiguously means the whole amount.
    refundedAmountInCents: status === "REFUNDED" || status === "REVERSED" ? amount : 0,
    currency,
    invoiceId: meta.invoiceId,
    businessId: meta.businessId,
    connectionId: meta.connectionId,
    occurredAt: parsePaypalDate(capture.update_time) ?? parsePaypalDate(capture.create_time),
  };
}

function firstCapture(order: PayPalOrder): { capture: PayPalCapture; orderId: string } | null {
  if (!order || typeof order !== "object") throw new Error("PayPal returned an unusable order.");
  for (const unit of order.purchase_units ?? []) {
    const capture = unit.payments?.captures?.[0];
    if (capture && asString(capture.id))
      return { capture, orderId: asString(order.id) ?? "" };
  }
  return null;
}

export async function capturePaypalOrder(input: {
  credentials: PayPalCredentials;
  environment: "test" | "live";
  orderId: string;
  idempotencyKey: string;
  fetchImpl?: PayPalFetch;
}): Promise<ProviderPaymentSnapshot | null> {
  let order: PayPalOrder;
  try {
    order = await paypalRequest<PayPalOrder>({
      clientId: input.credentials.clientId,
      clientSecret: input.credentials.clientSecret,
      environment: input.environment,
      method: "POST",
      path: `/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`,
      body: {},
      requestId: input.idempotencyKey,
      fetchImpl: input.fetchImpl,
    });
  } catch (error) {
    // Already captured/completed orders surface here; the CAPTURE.COMPLETED
    // webhook (or refresh) is authoritative for money either way.
    if (error instanceof Error && /ALREADY_CAPTURED|ORDER_ALREADY_CAPTURED|ORDER_COMPLETED/i.test(error.message))
      return null;
    throw error;
  }
  const found = firstCapture(order);
  if (!found) return null;
  const snapshot = captureToSnapshot(found.capture, found.orderId || undefined, {});
  snapshot.environment = input.environment;
  return snapshot;
}

export async function retrievePaypalOrder(input: {
  credentials: PayPalCredentials;
  environment: "test" | "live";
  orderId: string;
  fetchImpl?: PayPalFetch;
}): Promise<ProviderPaymentSnapshot> {
  const order = await paypalRequest<PayPalOrder>({
    clientId: input.credentials.clientId,
    clientSecret: input.credentials.clientSecret,
    environment: input.environment,
    method: "GET",
    path: `/v2/checkout/orders/${encodeURIComponent(input.orderId)}`,
    fetchImpl: input.fetchImpl,
  });
  if (!asString(order?.id)) throw new Error("PayPal order not found.");
  const found = firstCapture(order);
  if (found) {
    const snapshot = captureToSnapshot(found.capture, found.orderId || undefined, {});
    snapshot.environment = input.environment;
    return snapshot;
  }
  const unit = order.purchase_units?.[0];
  const currency = (asString(unit?.amount?.currency_code) ?? "USD").toUpperCase();
  return {
    provider: "paypal",
    environment: input.environment,
    providerCheckoutId: order.id,
    status: "pending",
    amountInCents: paypalToCents(unit?.amount?.value, currency) ?? 0,
    refundedAmountInCents: 0,
    currency,
    invoiceId: asString(unit?.custom_id),
    occurredAt: parsePaypalDate(order.update_time) ?? parsePaypalDate(order.create_time),
  };
}

export async function retrievePaypalCapture(input: {
  credentials: PayPalCredentials;
  environment: "test" | "live";
  captureId: string;
  fetchImpl?: PayPalFetch;
}): Promise<ProviderPaymentSnapshot> {
  const capture = await paypalRequest<PayPalCapture>({
    clientId: input.credentials.clientId,
    clientSecret: input.credentials.clientSecret,
    environment: input.environment,
    method: "GET",
    path: `/v2/payments/captures/${encodeURIComponent(input.captureId)}`,
    fetchImpl: input.fetchImpl,
  });
  if (!asString(capture?.id)) throw new Error("PayPal capture not found.");
  const snapshot = captureToSnapshot(capture, undefined, {});
  snapshot.environment = input.environment;
  return snapshot;
}

export function credentialsFromRecord(credentials: Record<string, string>): PayPalCredentials {
  return {
    clientId: credentials.clientId ?? "",
    clientSecret: credentials.clientSecret ?? "",
    webhookId: credentials.webhookId ?? "",
  };
}
