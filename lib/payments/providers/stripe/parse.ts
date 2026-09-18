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
  chargePaymentIntentId,
  paymentIntentId,
  sumRefunded,
  unixToDate,
  type StripeCharge,
  type StripeCheckoutSession,
  type StripePaymentIntent,
  type StripeWebhookEvent,
} from "@/lib/payments/providers/stripe/types";

const SUPPORTED_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
  "charge.refund.updated",
]);

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

function base(input: {
  livemode: boolean;
  currency?: string;
  invoiceId?: string;
  businessId?: string;
  connectionId?: string;
}): Omit<ProviderPaymentSnapshot, "providerCheckoutId" | "providerPaymentId" | "status" | "amountInCents" | "refundedAmountInCents" | "occurredAt"> & {
  occurredAt?: Date;
} {
  return {
    provider: "stripe",
    environment: input.livemode ? "live" : "test",
    currency: (input.currency ?? "USD").toUpperCase(),
    invoiceId: input.invoiceId,
    businessId: input.businessId,
    connectionId: input.connectionId,
  };
}

function snapshotFromSession(
  session: StripeCheckoutSession,
  status: PaymentStatus,
): ProviderPaymentSnapshot {
  const meta = requoMetadata(session.metadata);
  return {
    ...base({
      livemode: session.livemode === true,
      currency: asString(session.currency),
      invoiceId: meta.invoiceId,
      businessId: meta.businessId,
      connectionId: meta.connectionId,
    }),
    providerCheckoutId: session.id,
    providerPaymentId: paymentIntentId(session.payment_intent),
    status,
    amountInCents: asNumber(session.amount_total) ?? 0,
    refundedAmountInCents: 0,
    occurredAt: unixToDate(session.created),
  };
}

function snapshotFromIntent(intent: StripePaymentIntent): ProviderPaymentSnapshot {
  const meta = requoMetadata(intent.metadata);
  const charges = intent.charges?.data ?? [];
  // Unknown future statuses stay non-terminal (processing) so a later
  // authoritative event can still move the payment. Only explicit failure
  // and cancellation are terminal here.
  const status: PaymentStatus =
    intent.status === "succeeded"
      ? "succeeded"
      : intent.status === "canceled"
        ? "canceled"
        : intent.status === "requires_payment_method" || intent.status === "requires_confirmation"
          ? "failed"
          : "processing";
  return {
    ...base({
      livemode: intent.livemode === true,
      currency: asString(intent.currency),
      invoiceId: meta.invoiceId,
      businessId: meta.businessId,
      connectionId: meta.connectionId,
    }),
    providerPaymentId: intent.id,
    status,
    amountInCents: asNumber(intent.amount) ?? 0,
    refundedAmountInCents: sumRefunded(charges),
    occurredAt: unixToDate(intent.created),
  };
}

export function parseStripeWebhook(
  payload: unknown,
  _environment: ProviderEnvironment,
): NormalizedWebhook {
  const event = (payload ?? {}) as StripeWebhookEvent;
  const rawType = asString(event.type) ?? "unknown";
  const providerEventId = asString(event.id) ?? `stripe:${rawType}`;
  // Connect direct-charge events carry the connected account id. The engine
  // requires it to match the stored connection account when both exist.
  const eventAccount = asString((event as { account?: unknown }).account);
  const object = asRecord(event.data?.object);
  const withAccount = (snapshot: ProviderPaymentSnapshot): ProviderPaymentSnapshot =>
    eventAccount ? { ...snapshot, providerAccountId: eventAccount } : snapshot;

  if (!SUPPORTED_TYPES.has(rawType)) {
    return { providerEventId, rawType, snapshot: null, rawPayload: payload };
  }

  if (
    rawType === "checkout.session.completed" ||
    rawType === "checkout.session.async_payment_succeeded" ||
    rawType === "checkout.session.async_payment_failed" ||
    rawType === "checkout.session.expired"
  ) {
    const session = object as unknown as StripeCheckoutSession;
    if (!asString(session.id)) return { providerEventId, rawType, snapshot: null, rawPayload: payload };
    if (rawType === "checkout.session.expired") {
      return { providerEventId, rawType, snapshot: withAccount(snapshotFromSession(session, "canceled")), rawPayload: payload };
    }
    if (rawType === "checkout.session.async_payment_failed") {
      return { providerEventId, rawType, snapshot: withAccount(snapshotFromSession(session, "failed")), rawPayload: payload };
    }
    // checkout.session.completed alone is NOT money: async methods complete
    // unpaid. Only a paid session (or async_payment_succeeded) counts.
    const paid = asString(session.payment_status) === "paid" || rawType === "checkout.session.async_payment_succeeded";
    return {
      providerEventId,
      rawType,
      snapshot: withAccount(snapshotFromSession(session, paid ? "succeeded" : "processing")),
      rawPayload: payload,
    };
  }

  if (rawType === "payment_intent.succeeded" || rawType === "payment_intent.payment_failed" || rawType === "payment_intent.canceled") {
    const intent = object as unknown as StripePaymentIntent;
    if (!asString(intent.id)) return { providerEventId, rawType, snapshot: null, rawPayload: payload };
    return { providerEventId, rawType, snapshot: withAccount(snapshotFromIntent(intent)), rawPayload: payload };
  }

  const charge = object as unknown as StripeCharge;
  const paymentId = chargePaymentIntentId(charge);
  if (!asString(charge.id) || !paymentId) {
    return { providerEventId, rawType, snapshot: null, rawPayload: payload };
  }
  const charges = [charge];
  return {
    providerEventId,
    rawType,
    snapshot: withAccount({
      ...base({
        livemode: (charge as unknown as { livemode?: boolean }).livemode === true,
        currency: asString(charge.currency),
      }),
      providerPaymentId: paymentId,
      status: "succeeded",
      amountInCents: asNumber(charge.amount) ?? 0,
      refundedAmountInCents: sumRefunded(charges),
    }),
    rawPayload: payload,
  };
}
