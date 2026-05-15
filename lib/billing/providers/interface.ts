/**
 * Billing provider interface.
 *
 * Defines the contract that any payment provider implementation
 * (Dodo Payments, additional providers in the future) must satisfy so the rest of the
 * billing domain (checkout, subscription service, refunds, webhook
 * processor) can stay provider-agnostic.
 *
 * Each provider client lives alongside this file and exposes a
 * concrete implementation of `BillingProviderInterface`. Webhook
 * payloads are normalized via `parseWebhookEvent` so downstream
 * consumers only deal with `NormalizedWebhookEvent`.
 */

import type { BillingInterval, PaidPlan } from "@/lib/billing/types";

export type CheckoutSessionParams = {
  plan: PaidPlan;
  interval: BillingInterval;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSessionResult =
  | { type: "redirect"; url: string }
  | { type: "error"; message: string };

export type CancelSubscriptionResult = boolean;

export type RefundResult =
  | { type: "ok"; refundId: string; status: "pending" }
  | { type: "error"; message: string };

export type NormalizedEventType =
  | "subscription.activated"
  | "subscription.canceled"
  | "subscription.updated"
  | "subscription.expired"
  | "subscription.past_due"
  | "payment.succeeded"
  | "payment.failed"
  | "refund.succeeded"
  | "refund.failed"
  | "ignored";

export type NormalizedWebhookEvent = {
  eventId: string;
  eventType: NormalizedEventType;
  rawEventType: string;
  payload: {
    userId?: string;
    subscriptionId?: string;
    customerId?: string;
    plan?: string;
    currency?: string;
    status?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    paymentId?: string;
    amount?: number;
    refundId?: string;
  };
};

export interface BillingProviderInterface {
  createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult>;
  cancelSubscription(
    providerSubscriptionId: string,
  ): Promise<CancelSubscriptionResult>;
  requestRefund(
    providerPaymentId: string,
    reason: string,
  ): Promise<RefundResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent;
}
