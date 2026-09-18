import type {
  NormalizedWebhook,
  PaymentStatus,
  ProviderEnvironment,
  ProviderPaymentSnapshot,
} from "@/lib/payments/types";
import {
  asNumber,
  asRecord,
  asString,
  unixToDate,
  type PayMongoPayment,
  type PayMongoWebhookEnvelope,
} from "@/lib/payments/providers/paymongo/types";

const SUPPORTED_TYPES = new Set([
  "checkout_session.payment.paid",
  "payment.paid",
  "payment.failed",
  "payment.refunded",
  "payment.refund.updated",
]);

function refundEntryAmount(entry: unknown): number {
  const record = asRecord(entry);
  const direct = asNumber(record.amount);
  if (direct !== undefined) return direct;
  return asNumber(asRecord(record.attributes).amount) ?? 0;
}

function cumulativeRefunded(refunds: unknown): number {
  if (!Array.isArray(refunds)) return 0;
  return refunds.reduce((sum, entry) => sum + Math.max(0, refundEntryAmount(entry)), 0);
}

function requoMetadata(metadata: unknown): {
  invoiceId?: string;
  businessId?: string;
  connectionId?: string;
} {
  const record = asRecord(metadata);
  return {
    invoiceId: asString(record.requoInvoiceId),
    businessId: asString(record.requoBusinessId),
    connectionId: asString(record.requoConnectionId),
  };
}

function paymentSnapshotFromPayment(
  payment: PayMongoPayment,
  input: { environment: ProviderEnvironment; checkoutId?: string; fallbackMeta?: Record<string, unknown> },
): ProviderPaymentSnapshot {
  const attributes = payment.attributes ?? {};
  const status: PaymentStatus = attributes.status === "paid" ? "succeeded" : attributes.status === "failed" ? "failed" : "processing";
  const meta = requoMetadata(attributes.metadata ?? input.fallbackMeta);
  return {
    provider: "paymongo",
    environment: input.environment,
    providerCheckoutId: attributes.checkout_session_id ?? input.checkoutId,
    providerPaymentId: payment.id,
    status,
    amountInCents: asNumber(attributes.amount) ?? 0,
    refundedAmountInCents: cumulativeRefunded(attributes.refunds),
    currency: (asString(attributes.currency) ?? "PHP").toUpperCase(),
    invoiceId: meta.invoiceId,
    businessId: meta.businessId,
    connectionId: meta.connectionId,
    occurredAt:
      unixToDate(attributes.paid_at) ??
      unixToDate(attributes.updated_at) ??
      unixToDate(attributes.created_at),
  };
}

export function parsePaymongoWebhook(
  payload: unknown,
  // Endpoint env (interface conformance). The snapshot carries the payload's
  // own livemode truth so the engine can reject cross-environment delivery
  // as environment_mismatch.
  _environment: ProviderEnvironment,
): NormalizedWebhook {
  const envelope = (payload ?? {}) as PayMongoWebhookEnvelope;
  const data = envelope.data ?? {};
  const rawType = asString(data.type) ?? asString(envelope.event_type)?.replace(/\.webhook$/, "") ?? "unknown";
  const resourceId = asString(data.id);
  const providerEventId = resourceId ?? `paymongo:${rawType}`;
  const livemode = data.livemode === true;
  const payloadEnvironment: ProviderEnvironment = livemode ? "live" : "test";
  const attributes = asRecord(data.attributes);

  if (!SUPPORTED_TYPES.has(rawType)) {
    return { providerEventId, rawType, snapshot: null, rawPayload: payload };
  }

  if (rawType === "checkout_session.payment.paid") {
    const meta = requoMetadata(attributes.metadata);
    const payments = Array.isArray(attributes.payments) ? (attributes.payments as PayMongoPayment[]) : [];
    const paid = payments.find((p) => asRecord(p.attributes).status === "paid") ?? payments[0];
    if (!paid || !asString(paid.id)) {
      return {
        providerEventId,
        rawType,
        snapshot: {
          provider: "paymongo",
          environment: payloadEnvironment,
          providerCheckoutId: resourceId,
          status: "succeeded",
          amountInCents: 0,
          refundedAmountInCents: 0,
          currency: "PHP",
          invoiceId: meta.invoiceId,
          businessId: meta.businessId,
          connectionId: meta.connectionId,
        },
        rawPayload: payload,
      };
    }
    const snapshot = paymentSnapshotFromPayment(paid, {
      environment: payloadEnvironment,
      checkoutId: resourceId,
      fallbackMeta: asRecord(attributes.metadata),
    });
    if (!snapshot.invoiceId) snapshot.invoiceId = meta.invoiceId;
    if (!snapshot.businessId) snapshot.businessId = meta.businessId;
    if (!snapshot.connectionId) snapshot.connectionId = meta.connectionId;
    snapshot.status = "succeeded";
    return { providerEventId, rawType, snapshot, rawPayload: payload };
  }

  const payment: PayMongoPayment = {
    id: resourceId ?? "",
    type: asString(data.resource),
    attributes: {
      amount: asNumber(attributes.amount),
      currency: asString(attributes.currency),
      status: asString(attributes.status),
      livemode,
      paid_at: asNumber(attributes.paid_at),
      created_at: asNumber(attributes.created_at),
      updated_at: asNumber(attributes.updated_at),
      payment_intent_id: asString(attributes.payment_intent_id),
      checkout_session_id: asString(attributes.checkout_session_id),
      metadata: asRecord(attributes.metadata),
      refunds: Array.isArray(attributes.refunds) ? (attributes.refunds as PayMongoPayment["attributes"]["refunds"]) : [],
    },
  };
  if (!payment.id) {
    return { providerEventId, rawType, snapshot: null, rawPayload: payload };
  }
  const snapshot = paymentSnapshotFromPayment(payment, { environment: payloadEnvironment });
  if (rawType === "payment.refunded" || rawType === "payment.refund.updated") {
    if (snapshot.status === "failed") snapshot.status = "processing";
    if (snapshot.status === "processing" && snapshot.refundedAmountInCents > 0) snapshot.status = "succeeded";
  }
  return { providerEventId, rawType, snapshot, rawPayload: payload };
}
