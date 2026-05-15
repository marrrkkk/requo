import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import DodoPayments from "dodopayments";

import type { BillingInterval, PaidPlan } from "@/lib/billing/types";

import type {
  BillingProviderInterface,
  CancelSubscriptionResult,
  CheckoutSessionParams,
  CheckoutSessionResult,
  NormalizedEventType,
  NormalizedWebhookEvent,
  RefundResult,
} from "./interface";

/**
 * Dodo Payments billing provider implementation.
 *
 * Uses the official `dodopayments` TypeScript SDK for API calls
 * (subscriptions, refunds, payments). Webhook signature verification
 * uses raw HMAC-SHA256 per the Standard Webhooks spec.
 *
 * All methods catch errors and return structured results — never throw.
 */

const PRODUCT_KEYS = {
  "pro:monthly": "proMonthly",
  "pro:yearly": "proYearly",
  "business:monthly": "businessMonthly",
  "business:yearly": "businessYearly",
} as const;

type DodoEnvironment = "test_mode" | "live_mode";

type DodoProductIdMap = {
  proMonthly?: string;
  proYearly?: string;
  businessMonthly?: string;
  businessYearly?: string;
};

export type DodoProviderConfig = {
  apiKey: string | undefined;
  webhookSecret: string | undefined;
  environment: DodoEnvironment;
  productIds: DodoProductIdMap;
};

export class DodoProvider implements BillingProviderInterface {
  private readonly webhookSecret: string;
  private readonly productIds: DodoProductIdMap;
  private readonly client: DodoPayments;

  constructor(config: DodoProviderConfig) {
    this.webhookSecret = config.webhookSecret ?? "";
    this.productIds = config.productIds;
    this.client = new DodoPayments({
      bearerToken: config.apiKey ?? "",
      environment: config.environment,
    });
  }

  /* ── Checkout ─────────────────────────────────────────────────────────── */

  async createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    const productId = this.getProductId(params.plan, params.interval);

    if (!productId) {
      return {
        type: "error",
        message: `No Dodo product configured for ${params.plan} (${params.interval}).`,
      };
    }

    try {
      const subscription = await this.client.subscriptions.create({
        product_id: productId,
        payment_link: true,
        quantity: 1,
        billing: {
          country: "US",
          state: "",
          city: "",
          street: "",
          zipcode: "",
        },
        customer: {
          email: params.userEmail,
          name: params.userEmail,
        },
        metadata: {
          userId: params.userId,
          plan: params.plan,
          interval: params.interval,
        },
        return_url: params.successUrl,
      });

      const url = subscription.payment_link;

      if (!url) {
        return {
          type: "error",
          message: "Dodo Payments did not return a checkout URL.",
        };
      }

      return { type: "redirect", url };
    } catch (error) {
      if (error instanceof DodoPayments.APIError) {
        return {
          type: "error",
          message: `Dodo Payments error (${error.status}): ${error.message}`,
        };
      }
      return {
        type: "error",
        message:
          error instanceof Error
            ? `Unable to reach Dodo Payments: ${error.message}`
            : "Unable to reach Dodo Payments.",
      };
    }
  }

  /* ── Cancel ───────────────────────────────────────────────────────────── */

  async cancelSubscription(
    providerSubscriptionId: string,
  ): Promise<CancelSubscriptionResult> {
    if (!providerSubscriptionId) return false;

    try {
      await this.client.subscriptions.update(providerSubscriptionId, {
        status: "cancelled",
      });
      return true;
    } catch {
      return false;
    }
  }

  /* ── Refund ───────────────────────────────────────────────────────────── */

  async requestRefund(
    providerPaymentId: string,
    reason: string,
  ): Promise<RefundResult> {
    if (!providerPaymentId) {
      return { type: "error", message: "Missing payment id." };
    }

    try {
      const refund = await this.client.refunds.create({
        payment_id: providerPaymentId,
        reason: reason.slice(0, 500),
      });

      const refundId = refund.refund_id;

      if (!refundId) {
        return {
          type: "error",
          message: "Dodo Payments did not return a refund identifier.",
        };
      }

      return { type: "ok", refundId, status: "pending" };
    } catch (error) {
      if (error instanceof DodoPayments.APIError) {
        return {
          type: "error",
          message: `Dodo Payments error (${error.status}): ${error.message}`,
        };
      }
      return {
        type: "error",
        message:
          error instanceof Error
            ? `Unable to reach Dodo Payments: ${error.message}`
            : "Unable to reach Dodo Payments.",
      };
    }
  }

  /* ── Payment details (for billing history UI) ─────────────────────────── */

  /**
   * Fetches payment details from Dodo to get the actual payment method
   * (card brand, last 4, etc.). Returns null on failure so callers can
   * gracefully fall back to generic display.
   */
  async getPaymentDetails(providerPaymentId: string): Promise<{
    paymentMethod: string | null;
    paymentMethodType: string | null;
    cardBrand: string | null;
    cardLast4: string | null;
  } | null> {
    if (!providerPaymentId) return null;

    try {
      const payment = await this.client.payments.retrieve(providerPaymentId);
      return {
        paymentMethod: payment.payment_method ?? null,
        paymentMethodType: payment.payment_method_type ?? null,
        cardBrand: payment.card_network ?? null,
        cardLast4: payment.card_last_four ?? null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches subscription details from Dodo. Useful for showing the
   * current payment method on the billing settings page.
   */
  async getSubscriptionDetails(providerSubscriptionId: string): Promise<{
    status: string | null;
    nextBillingDate: string | null;
    paymentMethod: string | null;
  } | null> {
    if (!providerSubscriptionId) return null;

    try {
      const sub = await this.client.subscriptions.retrieve(providerSubscriptionId);
      return {
        status: sub.status ?? null,
        nextBillingDate: sub.next_billing_date ?? null,
        paymentMethod: (sub as unknown as Record<string, unknown>).payment_method as string ?? null,
      };
    } catch {
      return null;
    }
  }

  /* ── Webhook verification ─────────────────────────────────────────────── */

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.webhookSecret) return false;
    if (!signatureHeader) return false;

    const candidates = signatureHeader
      .split(" ")
      .map((part) => {
        const [, sig] = part.split(",", 2);
        return (sig ?? part).trim();
      })
      .filter(Boolean);

    if (candidates.length === 0) return false;

    let secret = this.webhookSecret;
    if (secret.startsWith("whsec_")) {
      secret = secret.slice("whsec_".length);
    }

    let secretBytes: Buffer;
    try {
      secretBytes = Buffer.from(secret, "base64");
      if (secretBytes.length === 0) {
        secretBytes = Buffer.from(secret, "utf8");
      }
    } catch {
      secretBytes = Buffer.from(secret, "utf8");
    }

    const expected = createHmac("sha256", secretBytes)
      .update(rawBody)
      .digest();

    for (const candidate of candidates) {
      let received: Buffer;
      try {
        received = Buffer.from(candidate, "base64");
      } catch {
        continue;
      }

      if (received.length !== expected.length) continue;
      if (timingSafeEqual(received, expected)) return true;
    }

    return false;
  }

  /* ── Webhook parsing ──────────────────────────────────────────────────── */

  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent {
    type DodoEventBody = {
      id?: string;
      event_id?: string;
      type?: string;
      event_type?: string;
      data?: Record<string, unknown>;
    };

    let parsed: DodoEventBody;
    try {
      parsed = JSON.parse(rawBody) as DodoEventBody;
    } catch {
      parsed = {};
    }

    const rawEventType = parsed.type ?? parsed.event_type ?? "";
    const eventId = parsed.id ?? parsed.event_id ?? "";
    const data = (parsed.data ?? {}) as Record<string, unknown>;

    return {
      eventId,
      rawEventType,
      eventType: mapEventType(rawEventType),
      payload: this.extractPayload(rawEventType, data),
    };
  }

  /* ── Private helpers ──────────────────────────────────────────────────── */

  private extractPayload(
    rawEventType: string,
    data: Record<string, unknown>,
  ): NormalizedWebhookEvent["payload"] {
    const metadata = readObject(data.metadata);
    const customer = readObject(data.customer);

    const userId =
      readString(metadata?.userId) ??
      readString(metadata?.user_id) ??
      readString(data.user_id);

    const subscriptionId =
      readString(data.subscription_id) ?? readString(data.id);
    const customerId =
      readString(data.customer_id) ?? readString(customer?.customer_id);
    const productId =
      readString(data.product_id) ?? readString(readObject(data.product)?.id);
    const plan = productId ? this.reverseProductId(productId) : undefined;
    const currency =
      readString(data.currency) ??
      readString(readObject(data.payment)?.currency) ??
      readString(readObject(data.totals)?.currency);
    const status =
      readString(data.status) ?? readString(data.subscription_status);
    const currentPeriodStart =
      readDate(data.previous_billing_date) ??
      readDate(data.current_period_start) ??
      readDate(readObject(data.current_period)?.start);
    const currentPeriodEnd =
      readDate(data.next_billing_date) ??
      readDate(data.current_period_end) ??
      readDate(readObject(data.current_period)?.end);
    const paymentId =
      readString(data.payment_id) ??
      (rawEventType.startsWith("payment.") ? readString(data.id) : undefined);
    const amount =
      readNumber(data.amount) ??
      readNumber(data.total_amount) ??
      readNumber(readObject(data.totals)?.total);
    const refundId =
      readString(data.refund_id) ??
      (rawEventType.startsWith("refund.") ? readString(data.id) : undefined);

    return {
      userId,
      subscriptionId,
      customerId,
      plan,
      currency,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      paymentId,
      amount,
      refundId,
    };
  }

  private getProductId(plan: PaidPlan, interval: BillingInterval): string {
    const key = `${plan}:${interval}` as keyof typeof PRODUCT_KEYS;
    const productKey = PRODUCT_KEYS[key];
    return this.productIds[productKey] ?? "";
  }

  private reverseProductId(productId: string): "pro" | "business" | undefined {
    if (
      productId === this.productIds.proMonthly ||
      productId === this.productIds.proYearly
    ) {
      return "pro";
    }

    if (
      productId === this.productIds.businessMonthly ||
      productId === this.productIds.businessYearly
    ) {
      return "business";
    }

    return undefined;
  }
}

/* ── Event type mapping ─────────────────────────────────────────────────── */

function mapEventType(rawEventType: string): NormalizedEventType {
  switch (rawEventType) {
    case "subscription.active":
    case "subscription.renewed":
    case "subscription.created":
      return "subscription.activated";
    case "subscription.cancelled":
    case "subscription.canceled":
      return "subscription.canceled";
    case "subscription.updated":
      return "subscription.updated";
    case "subscription.expired":
      return "subscription.expired";
    case "subscription.past_due":
    case "subscription.on_hold":
      return "subscription.past_due";
    case "payment.succeeded":
      return "payment.succeeded";
    case "payment.failed":
      return "payment.failed";
    case "refund.succeeded":
      return "refund.succeeded";
    case "refund.failed":
      return "refund.failed";
    default:
      return "ignored";
  }
}

/* ── Utility readers ────────────────────────────────────────────────────── */

function readObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
