import type {
  PaymentProvider,
  ProviderEnvironment,
  ProviderPaymentStatus,
} from "@/lib/db/schema/payment-providers";

export type { PaymentProvider, ProviderEnvironment, ProviderPaymentStatus };

/** Requo payment lifecycle for provider money. Manual rows never use this. */
export type PaymentStatus = ProviderPaymentStatus;

export type ProviderPaymentSnapshot = {
  provider: PaymentProvider;
  environment: ProviderEnvironment;

  providerCheckoutId?: string;
  providerPaymentId?: string;

  /**
   * Provider-side account carrying the money (Stripe Connect `account`).
   * The engine requires it to match the connection's stored account id when
   * both are present; BYO snapshots never set it.
   */
  providerAccountId?: string;

  status: PaymentStatus;

  amountInCents: number;
  refundedAmountInCents: number;

  /**
   * Individual-refund providers (PayPal refund webhooks carry one refund, not
   * a cumulative total). The engine adds this to the stored cumulative total
   * unless providerRefundId was already applied.
   */
  incrementalRefundAmountInCents?: number;
  providerRefundId?: string;

  currency: string;

  invoiceId?: string;
  businessId?: string;
  connectionId?: string;

  occurredAt?: Date;
};

export type NormalizedWebhook = {
  providerEventId: string;
  rawType: string;
  snapshot: ProviderPaymentSnapshot | null;
  rawPayload: unknown;
};

export type ProviderCredentials = Record<string, string>;

export interface PaymentProviderAdapter {
  provider: PaymentProvider;

  supportsCurrency(currency: string): boolean;

  createCheckout(input: {
    credentials: ProviderCredentials;
    environment: ProviderEnvironment;
    amountInCents: number;
    currency: string;
    invoiceId: string;
    businessId: string;
    connectionId: string;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey: string;
    metadata: {
      requoInvoiceId: string;
      requoInvoiceNumber: string;
      requoBusinessId: string;
      requoConnectionId: string;
    };
  }): Promise<{
    checkoutUrl: string;
    providerCheckoutId: string;
  }>;

  getPayment(input: {
    credentials: ProviderCredentials;
    environment: ProviderEnvironment;
    providerPaymentId: string;
  }): Promise<ProviderPaymentSnapshot>;

  refundPayment(input: {
    credentials: ProviderCredentials;
    environment: ProviderEnvironment;
    providerPaymentId: string;
    amountInCents: number;
    idempotencyKey: string;
  }): Promise<{
    accepted: boolean;
    providerRefundId?: string;
  }>;

  verifyWebhook(input: {
    rawBody: string;
    headers: Headers;
    credentials: ProviderCredentials;
    environment: ProviderEnvironment;
  }): Promise<{ ok: true } | { ok: false; reason: string }>;

  parseWebhook(
    payload: unknown,
    environment: ProviderEnvironment,
  ): NormalizedWebhook;

  /**
   * Optional provider-side fulfillment after a checkout is approved but no
   * money is known yet (PayPal: capture the approved order). Returns the
   * resulting money snapshot, or null when there is nothing to do.
   */
  fulfillCheckout?(input: {
    credentials: ProviderCredentials;
    environment: ProviderEnvironment;
    snapshot: ProviderPaymentSnapshot;
    idempotencyKey: string;
  }): Promise<ProviderPaymentSnapshot | null>;
}
