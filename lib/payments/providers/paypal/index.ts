import "server-only";

import type {
  NormalizedWebhook,
  PaymentProviderAdapter,
  ProviderCredentials,
  ProviderEnvironment,
  ProviderPaymentSnapshot,
} from "@/lib/payments/types";
import {
  capturePaypalOrder,
  createPaypalOrder,
  credentialsFromRecord,
  retrievePaypalCapture,
  retrievePaypalOrder,
} from "@/lib/payments/providers/paypal/orders";
import { createPaypalRefund } from "@/lib/payments/providers/paypal/refund";
import { parsePaypalWebhook } from "@/lib/payments/providers/paypal/parse";
import { verifyPaypalWebhook } from "@/lib/payments/providers/paypal/verify";

export function createPayPalAdapter(opts?: {
  fetchCert?: (certUrl: string) => Promise<string>;
}): PaymentProviderAdapter {
  return {
    provider: "paypal",

    supportsCurrency: (currency: string) => /^[A-Za-z]{3}$/.test(currency.trim()),

    async createCheckout(input) {
      const credentials = credentialsFromRecord(input.credentials);
      return createPaypalOrder({
        credentials,
        environment: input.environment,
        amountInCents: input.amountInCents,
        currency: input.currency,
        invoiceNumber: input.metadata.requoInvoiceNumber,
        invoiceTitle: input.metadata.requoInvoiceNumber,
        requoInvoiceId: input.metadata.requoInvoiceId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        idempotencyKey: input.idempotencyKey,
      });
    },

    async getPayment(input: {
      credentials: ProviderCredentials;
      environment: ProviderEnvironment;
      providerPaymentId: string;
    }): Promise<ProviderPaymentSnapshot> {
      const credentials = credentialsFromRecord(input.credentials);
      // Order ids carry no prefix; captures are alphanumeric of similar shape.
      // Try the capture endpoint first, fall back to the order endpoint.
      try {
        const snapshot = await retrievePaypalCapture({
          credentials,
          environment: input.environment,
          captureId: input.providerPaymentId,
        });
        snapshot.environment = input.environment;
        return snapshot;
      } catch {
        const snapshot = await retrievePaypalOrder({
          credentials,
          environment: input.environment,
          orderId: input.providerPaymentId,
        });
        snapshot.environment = input.environment;
        return snapshot;
      }
    },

    async refundPayment(input) {
      const credentials = credentialsFromRecord(input.credentials);
      const payment = await retrievePaypalCapture({
        credentials,
        environment: input.environment,
        captureId: input.providerPaymentId,
      });
      const { providerRefundId } = await createPaypalRefund({
        credentials,
        environment: input.environment,
        captureId: input.providerPaymentId,
        amountInCents: input.amountInCents,
        currency: payment.currency,
        idempotencyKey: input.idempotencyKey,
      });
      return { accepted: true, providerRefundId };
    },

    async verifyWebhook(input) {
      const credentials = credentialsFromRecord(input.credentials);
      return verifyPaypalWebhook({
        rawBody: input.rawBody,
        headers: input.headers,
        webhookId: credentials.webhookId,
        environment: input.environment,
        fetchCert: opts?.fetchCert,
      });
    },

    parseWebhook(payload: unknown, environment: ProviderEnvironment): NormalizedWebhook {
      return parsePaypalWebhook(payload, environment);
    },

    async fulfillCheckout(input: {
      credentials: ProviderCredentials;
      environment: ProviderEnvironment;
      snapshot: ProviderPaymentSnapshot;
      idempotencyKey: string;
    }): Promise<ProviderPaymentSnapshot | null> {
      // Nothing to fulfill once money is known; approval-only snapshots carry
      // a checkout (order) id with no capture yet.
      if (input.snapshot.providerPaymentId || !input.snapshot.providerCheckoutId) return null;
      if (input.snapshot.status !== "processing") return null;
      const credentials = credentialsFromRecord(input.credentials);
      const snapshot = await capturePaypalOrder({
        credentials,
        environment: input.environment,
        orderId: input.snapshot.providerCheckoutId,
        idempotencyKey: input.idempotencyKey,
      });
      if (!snapshot) return null;
      snapshot.environment = input.environment;
      if (!snapshot.invoiceId) snapshot.invoiceId = input.snapshot.invoiceId;
      if (!snapshot.businessId) snapshot.businessId = input.snapshot.businessId;
      if (!snapshot.connectionId) snapshot.connectionId = input.snapshot.connectionId;
      return snapshot;
    },
  };
}
