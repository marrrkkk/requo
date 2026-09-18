import type {
  NormalizedWebhook,
  ProviderEnvironment,
  ProviderPaymentSnapshot,
} from "@/lib/payments/types";
import {
  asString,
  parsePaypalDate,
  paypalToCents,
  type PayPalWebhookEvent,
} from "@/lib/payments/providers/paypal/types";

const SUPPORTED_TYPES = new Set([
  "CHECKOUT.ORDER.APPROVED",
  "CHECKOUT.ORDER.COMPLETED",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.PENDING",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.DECLINED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.CAPTURE.REVERSED",
  "CHECKOUT.PAYMENT-APPROVAL.REVERSED",
]);

function captureIdFromUpLink(resource: Record<string, unknown>): string | undefined {
  const links = (resource.links ?? []) as Array<{ rel?: string; href?: string }>;
  if (!Array.isArray(links)) return undefined;
  const up = links.find((link) => link?.rel === "up" && typeof link.href === "string");
  const match = up?.href?.match(/\/v2\/payments\/captures\/([^/?#]+)/);
  return match?.[1];
}

// PayPal webhook payloads carry no livemode flag, so the per-connection
// endpoint environment is authoritative. Cross-environment delivery is still
// rejected: test and live webhooks have different webhook IDs, and signature
// verification requires the connection's own webhook ID.
export function parsePaypalWebhook(
  payload: unknown,
  environment: ProviderEnvironment,
): NormalizedWebhook {
  const event = (payload ?? {}) as PayPalWebhookEvent;
  const rawType = asString(event.event_type) ?? "unknown";
  const providerEventId = asString(event.id) ?? `paypal:${rawType}`;
  const resource = (event.resource ?? {}) as Record<string, unknown>;

  if (!SUPPORTED_TYPES.has(rawType)) {
    return { providerEventId, rawType, snapshot: null, rawPayload: payload };
  }

  if (rawType === "CHECKOUT.ORDER.APPROVED") {
    // Approval is NOT money. The worker captures the order, then the
    // CAPTURE.COMPLETED webhook (or refresh) records the capture.
    const units = (resource.purchase_units ?? []) as Array<Record<string, unknown>>;
    const unit = units[0] ?? {};
    const amount = unit.amount as { currency_code?: string; value?: string } | undefined;
    const currency = (asString(amount?.currency_code) ?? "USD").toUpperCase();
    return {
      providerEventId,
      rawType,
      snapshot: {
        provider: "paypal",
        environment,
        providerCheckoutId: asString(resource.id),
        status: "processing",
        amountInCents: paypalToCents(amount?.value, currency) ?? 0,
        refundedAmountInCents: 0,
        currency,
        invoiceId: asString(unit.custom_id),
        occurredAt: parsePaypalDate(event.create_time),
      },
      rawPayload: payload,
    };
  }

  if (rawType === "CHECKOUT.ORDER.COMPLETED") {
    const units = (resource.purchase_units ?? []) as Array<{
      payments?: { captures?: Array<Record<string, unknown>> };
      custom_id?: unknown;
      amount?: { currency_code?: string; value?: string };
    }>;
    const capture = units.flatMap((unit) => unit.payments?.captures ?? [])[0] as
      | Record<string, unknown>
      | undefined;
    if (capture && asString(capture.id)) {
      return {
        providerEventId,
        rawType,
        snapshot: captureSnapshot(capture, asString(resource.id), asString(units[0]?.custom_id), event.create_time, environment),
        rawPayload: payload,
      };
    }
    const amount = units[0]?.amount;
    const currency = (asString(amount?.currency_code) ?? "USD").toUpperCase();
    return {
      providerEventId,
      rawType,
      snapshot: {
        provider: "paypal",
        environment,
        providerCheckoutId: asString(resource.id),
        status: "processing",
        amountInCents: paypalToCents(amount?.value, currency) ?? 0,
        refundedAmountInCents: 0,
        currency,
        invoiceId: asString(units[0]?.custom_id),
        occurredAt: parsePaypalDate(event.create_time),
      },
      rawPayload: payload,
    };
  }

  if (rawType === "CHECKOUT.PAYMENT-APPROVAL.REVERSED") {
    const units = (resource.purchase_units ?? []) as Array<Record<string, unknown>>;
    const amount = (units[0]?.amount ?? {}) as { currency_code?: string; value?: string };
    const currency = (asString(amount?.currency_code) ?? "USD").toUpperCase();
    return {
      providerEventId,
      rawType,
      snapshot: {
        provider: "paypal",
        environment,
        providerCheckoutId: asString(resource.id),
        status: "canceled",
        amountInCents: paypalToCents(amount?.value, currency) ?? 0,
        refundedAmountInCents: 0,
        currency,
        invoiceId: asString(units[0]?.custom_id),
        occurredAt: parsePaypalDate(event.create_time),
      },
      rawPayload: payload,
    };
  }

  if (rawType === "PAYMENT.CAPTURE.REFUNDED") {
    // Resource is the individual REFUND (resource_type refund): the amount is
    // this refund only; the capture id comes from the `up` link. The engine
    // accumulates per-refund-id so redelivery is harmless.
    const amount = (resource.amount ?? {}) as { currency_code?: string; value?: string };
    const currency = (asString(amount?.currency_code) ?? "USD").toUpperCase();
    const captureId = captureIdFromUpLink(resource);
    if (!captureId || !asString(resource.id)) {
      return { providerEventId, rawType, snapshot: null, rawPayload: payload };
    }
    const snapshot: ProviderPaymentSnapshot = {
      provider: "paypal",
      environment,
      providerPaymentId: captureId,
      status: "succeeded",
      amountInCents: 0,
      refundedAmountInCents: 0,
      incrementalRefundAmountInCents: paypalToCents(amount?.value, currency) ?? 0,
      providerRefundId: asString(resource.id),
      currency,
      occurredAt: parsePaypalDate(event.create_time),
    };
    return { providerEventId, rawType, snapshot, rawPayload: payload };
  }

  // Capture lifecycle events carry the capture itself.
  if (!asString(resource.id)) {
    return { providerEventId, rawType, snapshot: null, rawPayload: payload };
  }
  return {
    providerEventId,
    rawType,
    snapshot: captureSnapshot(resource, orderIdFrom(resource), undefined, event.create_time, environment),
    rawPayload: payload,
  };
}

function orderIdFrom(resource: Record<string, unknown>): string | undefined {
  const related = (resource.supplementary_data ?? {}) as {
    related_ids?: { order_id?: string };
  };
  return asString(related.related_ids?.order_id);
}

function captureSnapshot(
  capture: Record<string, unknown>,
  orderId: string | undefined,
  invoiceId: string | undefined,
  createTime: string | undefined,
  environment: ProviderEnvironment,
): ProviderPaymentSnapshot {
  const amount = (capture.amount ?? {}) as { currency_code?: string; value?: string };
  const currency = (asString(amount?.currency_code) ?? "USD").toUpperCase();
  const gross = paypalToCents(amount?.value, currency) ?? 0;
  const status = asString(capture.status);
  if (status === "REFUNDED" || status === "REVERSED") {
    return {
      provider: "paypal",
      environment,
      providerCheckoutId: orderId,
      providerPaymentId: asString(capture.id),
      status: "succeeded",
      amountInCents: gross,
      refundedAmountInCents: gross,
      currency,
      invoiceId,
      occurredAt: parsePaypalDate(createTime),
    };
  }
  return {
    provider: "paypal",
    environment,
    providerCheckoutId: orderId,
    providerPaymentId: asString(capture.id),
    status:
      status === "COMPLETED"
        ? "succeeded"
        : status === "PENDING"
          ? "processing"
          : "failed",
    amountInCents: gross,
    refundedAmountInCents: 0,
    currency,
    invoiceId,
    occurredAt: parsePaypalDate(createTime),
  };
}
