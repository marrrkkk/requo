import "server-only";

import type { ProviderPaymentSnapshot } from "@/lib/payments/types";
import { stripeRequest, type StripeFetch } from "@/lib/payments/providers/stripe/client";
import {
  asNumber,
  asRecord,
  asString,
  paymentIntentId,
  sumRefunded,
  unixToDate,
  type StripeCheckoutSession,
  type StripeCredentials,
  type StripePaymentIntent,
} from "@/lib/payments/providers/stripe/types";

export async function createStripeCheckout(input: {
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
  /** Connected account for direct charges (platform mode). */
  stripeAccount?: string;
  fetchImpl?: StripeFetch;
}): Promise<{ checkoutUrl: string; providerCheckoutId: string; livemode: boolean }> {
  const form: Record<string, string> = {
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.invoiceNumber,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(input.amountInCents),
    "line_items[0][price_data][product_data][name]": (input.invoiceTitle || `Invoice ${input.invoiceNumber}`).slice(0, 200),
    "payment_intent_data[description]": `Requo invoice ${input.invoiceNumber}`.slice(0, 200),
  };
  for (const [key, value] of Object.entries(input.metadata)) {
    form[`metadata[${key}]`] = value;
    form[`payment_intent_data[metadata][${key}]`] = value;
  }
  if (input.customerEmail) form.customer_email = input.customerEmail;
  const session = await stripeRequest<StripeCheckoutSession>({
    secretKey: input.secretKey,
    method: "POST",
    path: "/v1/checkout/sessions",
    form,
    idempotencyKey: input.idempotencyKey,
    stripeAccount: input.stripeAccount,
    fetchImpl: input.fetchImpl,
  });
  if (!asString(session?.id) || !asString(session?.url))
    throw new Error("Stripe returned an unusable checkout session.");
  return { checkoutUrl: session.url as string, providerCheckoutId: session.id, livemode: session.livemode === true };
}

function intentToSnapshot(intent: StripePaymentIntent): ProviderPaymentSnapshot {
  const charges = intent.charges?.data ?? [];
  const meta = asRecord(intent.metadata);
  const status = intent.status === "succeeded" ? "succeeded" : intent.status === "canceled" ? "canceled" : "processing";
  return {
    provider: "stripe",
    environment: intent.livemode === true ? "live" : "test",
    providerPaymentId: intent.id,
    status,
    amountInCents: asNumber(intent.amount) ?? 0,
    refundedAmountInCents: sumRefunded(charges),
    currency: (asString(intent.currency) ?? "USD").toUpperCase(),
    invoiceId: asString(meta.requoInvoiceId),
    businessId: asString(meta.requoBusinessId),
    connectionId: asString(meta.requoConnectionId),
    occurredAt: unixToDate(intent.created),
  };
}

export async function retrieveStripeSession(input: {
  secretKey: string;
  sessionId: string;
  stripeAccount?: string;
  fetchImpl?: StripeFetch;
}): Promise<ProviderPaymentSnapshot> {
  const session = await stripeRequest<StripeCheckoutSession>({
    secretKey: input.secretKey,
    method: "GET",
    path: `/v1/checkout/sessions/${encodeURIComponent(input.sessionId)}`,
    form: { "expand[]": "payment_intent" },
    stripeAccount: input.stripeAccount,
    fetchImpl: input.fetchImpl,
  });
  if (!asString(session?.id)) throw new Error("Stripe checkout session not found.");
  const meta = asRecord(session.metadata);
  const environment = session.livemode === true ? "live" : "test";
  const intent = session.payment_intent;
  if (intent && typeof intent === "object" && asString(intent.id)) {
    const snapshot = intentToSnapshot(intent as StripePaymentIntent);
    snapshot.environment = environment;
    snapshot.providerCheckoutId = session.id;
    if (!snapshot.invoiceId) snapshot.invoiceId = asString(meta.requoInvoiceId);
    if (!snapshot.businessId) snapshot.businessId = asString(meta.requoBusinessId);
    if (!snapshot.connectionId) snapshot.connectionId = asString(meta.requoConnectionId);
    return snapshot;
  }
  const status =
    session.status === "expired" ? "canceled" : session.payment_status === "paid" ? "succeeded" : session.status === "complete" ? "processing" : "pending";
  return {
    provider: "stripe",
    environment,
    providerCheckoutId: session.id,
    providerPaymentId: paymentIntentId(session.payment_intent),
    status,
    amountInCents: asNumber(session.amount_total) ?? 0,
    refundedAmountInCents: 0,
    currency: (asString(session.currency) ?? "USD").toUpperCase(),
    invoiceId: asString(meta.requoInvoiceId),
    businessId: asString(meta.requoBusinessId),
    connectionId: asString(meta.requoConnectionId),
    occurredAt: unixToDate(session.created),
  };
}

export async function retrieveStripePaymentIntent(input: {
  secretKey: string;
  paymentIntentId: string;
  stripeAccount?: string;
  fetchImpl?: StripeFetch;
}): Promise<ProviderPaymentSnapshot> {
  const intent = await stripeRequest<StripePaymentIntent>({
    secretKey: input.secretKey,
    method: "GET",
    path: `/v1/payment_intents/${encodeURIComponent(input.paymentIntentId)}`,
    form: { "expand[]": "charges" },
    stripeAccount: input.stripeAccount,
    fetchImpl: input.fetchImpl,
  });
  if (!asString(intent?.id)) throw new Error("Stripe payment intent not found.");
  return intentToSnapshot(intent);
}

export function credentialsFromRecord(credentials: Record<string, string>): StripeCredentials {
  return { secretKey: credentials.secretKey ?? "", webhookSecret: credentials.webhookSecret ?? "" };
}

export function keyMatchesEnvironment(secretKey: string, environment: "test" | "live"): boolean {
  if (secretKey.startsWith("sk_test_")) return environment === "test";
  if (secretKey.startsWith("sk_live_")) return environment === "live";
  return true;
}
