import "server-only";

import type {
  NormalizedWebhook,
  PaymentProviderAdapter,
  ProviderCredentials,
  ProviderEnvironment,
  ProviderPaymentSnapshot,
} from "@/lib/payments/types";
import {
  createStripeCheckout,
  credentialsFromRecord,
  keyMatchesEnvironment,
  retrieveStripePaymentIntent,
  retrieveStripeSession,
} from "@/lib/payments/providers/stripe/checkout";
import { getStripePlatformConfig } from "@/lib/payments/providers/stripe/platform";
import { createStripeRefund } from "@/lib/payments/providers/stripe/refund";
import { parseStripeWebhook } from "@/lib/payments/providers/stripe/parse";
import { verifyStripeWebhook } from "@/lib/payments/providers/stripe/verify";

type ResolvedKeys =
  | { mode: "platform"; secretKey: string; stripeAccount: string }
  | { mode: "byo"; secretKey: string; stripeAccount?: undefined };

/**
 * Platform mode is selected purely by the stored credentials carrying a
 * provider account id (written at Connect completion). No interface change,
 * no caller branching: BYO rows behave exactly as before.
 */
function resolveKeys(credentials: ProviderCredentials): ResolvedKeys {
  const accountId =
    typeof credentials.providerAccountId === "string" && credentials.providerAccountId
      ? credentials.providerAccountId
      : undefined;
  if (accountId) {
    const platform = getStripePlatformConfig();
    if (!platform) throw new Error("Stripe platform is not configured.");
    return { mode: "platform", secretKey: platform.secretKey, stripeAccount: accountId };
  }
  return { mode: "byo", secretKey: credentialsFromRecord(credentials).secretKey };
}

export function createStripeAdapter(): PaymentProviderAdapter {
  return {
    provider: "stripe",

    supportsCurrency: (currency: string) => /^[A-Za-z]{3}$/.test(currency.trim()),

    async createCheckout(input) {
      const credentials = credentialsFromRecord(input.credentials);
      const keys = resolveKeys(input.credentials);
      if (keys.mode === "byo" && !keyMatchesEnvironment(credentials.secretKey, input.environment))
        throw new Error("Stripe secret key does not match the connection environment.");
      const result = await createStripeCheckout({
        secretKey: keys.secretKey,
        amountInCents: input.amountInCents,
        currency: input.currency,
        invoiceNumber: input.metadata.requoInvoiceNumber,
        invoiceTitle: input.metadata.requoInvoiceNumber,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        idempotencyKey: input.idempotencyKey,
        metadata: { ...input.metadata },
        stripeAccount: keys.stripeAccount,
      });
      const expectedLive = input.environment === "live";
      if (result.livemode !== expectedLive)
        throw new Error("Stripe session environment does not match the connection.");
      return { checkoutUrl: result.checkoutUrl, providerCheckoutId: result.providerCheckoutId };
    },

    async getPayment(input: {
      credentials: ProviderCredentials;
      environment: ProviderEnvironment;
      providerPaymentId: string;
    }): Promise<ProviderPaymentSnapshot> {
      const keys = resolveKeys(input.credentials);
      const snapshot = input.providerPaymentId.startsWith("cs_")
        ? await retrieveStripeSession({ secretKey: keys.secretKey, sessionId: input.providerPaymentId, stripeAccount: keys.stripeAccount })
        : await retrieveStripePaymentIntent({ secretKey: keys.secretKey, paymentIntentId: input.providerPaymentId, stripeAccount: keys.stripeAccount });
      snapshot.environment = input.environment;
      return snapshot;
    },

    async refundPayment(input) {
      const keys = resolveKeys(input.credentials);
      const { providerRefundId } = await createStripeRefund({
        secretKey: keys.secretKey,
        paymentIntentId: input.providerPaymentId,
        amountInCents: input.amountInCents,
        idempotencyKey: input.idempotencyKey,
        stripeAccount: keys.stripeAccount,
      });
      return { accepted: true, providerRefundId };
    },

    async verifyWebhook(input) {
      const keys = resolveKeys(input.credentials);
      const webhookSecret =
        keys.mode === "platform"
          ? (getStripePlatformConfig()?.webhookSecret ?? "")
          : credentialsFromRecord(input.credentials).webhookSecret;
      return verifyStripeWebhook({
        rawBody: input.rawBody,
        signatureHeader: input.headers.get("stripe-signature"),
        webhookSecret,
        environment: input.environment,
      });
    },

    parseWebhook(payload: unknown, environment: ProviderEnvironment): NormalizedWebhook {
      return parseStripeWebhook(payload, environment);
    },
  };
}
