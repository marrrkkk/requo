import "server-only";

import type {
  NormalizedWebhook,
  PaymentProviderAdapter,
  ProviderCredentials,
  ProviderEnvironment,
  ProviderPaymentSnapshot,
} from "@/lib/payments/types";
import {
  createPaymongoCheckout,
  credentialsFromRecord,
  retrievePaymongoPayment,
  retrievePaymongoSession,
} from "@/lib/payments/providers/paymongo/checkout";
import { createPaymongoRefund } from "@/lib/payments/providers/paymongo/refund";
import { parsePaymongoWebhook } from "@/lib/payments/providers/paymongo/parse";
import { verifyPaymongoWebhook } from "@/lib/payments/providers/paymongo/verify";

export function createPayMongoAdapter(): PaymentProviderAdapter {
  return {
    provider: "paymongo",

    supportsCurrency: () => true,

    async createCheckout(input) {
      const credentials = credentialsFromRecord(input.credentials);
      const result = await createPaymongoCheckout({
        secretKey: credentials.secretKey,
        amountInCents: input.amountInCents,
        currency: input.currency,
        invoiceNumber: input.metadata.requoInvoiceNumber,
        invoiceTitle: input.metadata.requoInvoiceNumber,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        idempotencyKey: input.idempotencyKey,
        metadata: { ...input.metadata },
      });
      const expectedLive = input.environment === "live";
      if (result.livemode !== expectedLive)
        throw new Error("PayMongo session environment does not match the connection.");
      return { checkoutUrl: result.checkoutUrl, providerCheckoutId: result.providerCheckoutId };
    },

    async getPayment(input: {
      credentials: ProviderCredentials;
      environment: ProviderEnvironment;
      providerPaymentId: string;
    }): Promise<ProviderPaymentSnapshot> {
      const credentials = credentialsFromRecord(input.credentials);
      const snapshot = input.providerPaymentId.startsWith("cs_")
        ? await retrievePaymongoSession({ secretKey: credentials.secretKey, checkoutId: input.providerPaymentId })
        : await retrievePaymongoPayment({ secretKey: credentials.secretKey, paymentId: input.providerPaymentId });
      snapshot.environment = input.environment;
      return snapshot;
    },

    async refundPayment(input) {
      const credentials = credentialsFromRecord(input.credentials);
      const { providerRefundId } = await createPaymongoRefund({
        secretKey: credentials.secretKey,
        paymentId: input.providerPaymentId,
        amountInCents: input.amountInCents,
        idempotencyKey: input.idempotencyKey,
      });
      return { accepted: true, providerRefundId };
    },

    async verifyWebhook(input) {
      const credentials = credentialsFromRecord(input.credentials);
      return verifyPaymongoWebhook({
        rawBody: input.rawBody,
        signatureHeader: input.headers.get("paymongo-signature"),
        webhookSecret: credentials.webhookSecret,
        environment: input.environment,
      });
    },

    parseWebhook(payload: unknown, environment: ProviderEnvironment): NormalizedWebhook {
      return parsePaymongoWebhook(payload, environment);
    },
  };
}
