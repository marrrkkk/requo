import "server-only";

/**
 * Paddle provider client for card/global subscriptions.
 *
 * Uses the Paddle REST API v2 directly (no SDK dependency).
 * Checkout flow:
 *   1. Create a transaction via API with price ID + custom data
 *   2. Return transaction ID to client
 *   3. Client opens Paddle.js overlay checkout with the transaction ID
 *   4. Webhook fires with subscription lifecycle events
 */

import crypto from "crypto";

import { env } from "@/lib/env";
import type { CheckoutResult, PaidPlan, SubscriptionStatus, BillingInterval } from "@/lib/billing/types";

function getPaddleApiBase(): string {
  return env.PADDLE_ENVIRONMENT === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

async function paddleRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${getPaddleApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.PADDLE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Paddle API error ${response.status}: ${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}

/* ── Price ID mapping ─────────────────────────────────────────────────────── */

function getPriceId(plan: PaidPlan, interval: BillingInterval = "monthly"): string {
  let priceId: string | undefined;

  if (interval === "yearly") {
    priceId =
      plan === "pro"
        ? env.PADDLE_PRO_YEARLY_PRICE_ID
        : env.PADDLE_BUSINESS_YEARLY_PRICE_ID;
  }

  // Fall back to monthly if yearly not configured
  if (!priceId) {
    priceId =
      plan === "pro"
        ? env.PADDLE_PRO_PRICE_ID
        : env.PADDLE_BUSINESS_PRICE_ID;
  }

  if (!priceId) {
    throw new Error(`Missing Paddle price ID for ${plan} ${interval} plan`);
  }

  return priceId;
}

/* ── Transaction / Checkout ───────────────────────────────────────────────── */

type PaddleTransactionResponse = {
  data: {
    id: string;
    status: string;
    checkout?: {
      url: string | null;
    };
    custom_data?: Record<string, string>;
    details?: {
      totals?: {
        total?: string;
      };
    };
  };
};

/**
 * Creates a Paddle transaction for overlay checkout.
 *
 * Returns the transaction ID which the client uses to open
 * the Paddle.js overlay checkout.
 */
export async function createPaddleTransaction(params: {
  plan: PaidPlan;
  userId: string;
  businessId: string;
  userEmail: string;
  userName?: string;
  interval?: BillingInterval;
}): Promise<CheckoutResult> {
  const priceId = getPriceId(params.plan, params.interval);

  try {
    const response = await paddleRequest<PaddleTransactionResponse>(
      "POST",
      "/transactions",
      {
        items: [
          {
            price_id: priceId,
            quantity: 1,
          },
        ],
        custom_data: {
          interval: params.interval ?? "monthly",
          user_id: params.userId,
          business_id: params.businessId,
          plan: params.plan,
        },
        ...(params.userEmail
          ? {
              customer: {
                email: params.userEmail,
                ...(params.userName ? { name: params.userName } : {}),
              },
            }
          : {}),
      },
    );

    return {
      type: "redirect",
      url: response.data.id, // Transaction ID used by Paddle.js overlay
    };
  } catch (error) {
    console.error("[Paddle] Transaction error:", error);
    return {
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Payment creation failed. Please try again.",
    };
  }
}

/**
 * Retrieves a Paddle transaction by ID.
 */
export async function getPaddleTransaction(
  transactionId: string,
): Promise<PaddleTransactionResponse["data"] | null> {
  try {
    const response = await paddleRequest<PaddleTransactionResponse>(
      "GET",
      `/transactions/${transactionId}`,
    );

    return response.data;
  } catch {
    return null;
  }
}

/* ── Adjustments (refunds) ────────────────────────────────────────────────── */

/**
 * Paddle adjustment statuses we care about.
 * See https://developer.paddle.com/api-reference/adjustments/overview
 */
export type PaddleAdjustmentStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "reversed";

type PaddleAdjustmentResponse = {
  data: {
    id: string;
    status: string;
    action: string;
    transaction_id: string;
    reason?: string | null;
    created_at?: string;
    updated_at?: string;
  };
};

export type PaddleAdjustmentResult =
  | {
      type: "ok";
      adjustmentId: string;
      status: PaddleAdjustmentStatus;
    }
  | {
      type: "error";
      message: string;
    };

/**
 * Maps a raw Paddle adjustment status to a normalized value.
 * Unknown statuses fall back to "pending_approval" so we don't lose
 * the request; the follow-up `adjustment.updated` webhook resolves it.
 */
export function mapPaddleAdjustmentStatus(
  paddleStatus: string | null | undefined,
): PaddleAdjustmentStatus {
  switch (paddleStatus) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "reversed":
      return "reversed";
    case "pending_approval":
    default:
      return "pending_approval";
  }
}

/**
 * Creates a Paddle refund adjustment for a completed transaction.
 *
 * Paddle returns the adjustment with a status of `pending_approval`,
 * `approved`, or `rejected`. Subsequent status changes arrive through
 * `adjustment.updated` webhooks.
 */
export async function createPaddleAdjustment(params: {
  transactionId: string;
  reason: string;
  type?: "full" | "partial";
}): Promise<PaddleAdjustmentResult> {
  try {
    const response = await paddleRequest<PaddleAdjustmentResponse>(
      "POST",
      "/adjustments",
      {
        action: "refund",
        type: params.type ?? "full",
        transaction_id: params.transactionId,
        reason: params.reason,
      },
    );

    return {
      type: "ok",
      adjustmentId: response.data.id,
      status: mapPaddleAdjustmentStatus(response.data.status),
    };
  } catch (error) {
    console.error("[Paddle] Adjustment error:", error);
    return {
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Refund creation failed. Please try again.",
    };
  }
}

/**
 * Retrieves a Paddle adjustment by ID.
 */
export async function getPaddleAdjustment(
  adjustmentId: string,
): Promise<PaddleAdjustmentResponse["data"] | null> {
  try {
    const response = await paddleRequest<PaddleAdjustmentResponse>(
      "GET",
      `/adjustments/${adjustmentId}`,
    );
    return response.data;
  } catch {
    return null;
  }
}

/* ── Subscription management ──────────────────────────────────────────────── */

type PaddleSubscriptionResponse = {
  data: {
    id: string;
    status: string;
    current_billing_period?: {
      starts_at: string;
      ends_at: string;
    };
    scheduled_change?: {
      action: string;
      effective_at: string;
    } | null;
    customer_id: string;
    custom_data?: Record<string, string>;
  };
};

/**
 * Retrieves a Paddle subscription by ID.
 */
export async function getPaddleSubscription(
  subscriptionId: string,
): Promise<PaddleSubscriptionResponse["data"] | null> {
  try {
    const response = await paddleRequest<PaddleSubscriptionResponse>(
      "GET",
      `/subscriptions/${subscriptionId}`,
    );
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Cancels a Paddle subscription.
 * By default, cancels at the end of the current billing period.
 */
export async function cancelPaddleSubscription(
  subscriptionId: string,
): Promise<boolean> {
  try {
    await paddleRequest<PaddleSubscriptionResponse>(
      "POST",
      `/subscriptions/${subscriptionId}/cancel`,
      {
        effective_from: "next_billing_period",
      },
    );
    return true;
  } catch (error) {
    console.error("[Paddle] Cancel error:", error);
    return false;
  }
}

/**
 * Resumes a paused or canceled Paddle subscription (if within grace period).
 */
export async function resumePaddleSubscription(
  subscriptionId: string,
): Promise<boolean> {
  try {
    await paddleRequest<PaddleSubscriptionResponse>(
      "PATCH",
      `/subscriptions/${subscriptionId}`,
      {
        scheduled_change: null,
      },
    );
    return true;
  } catch (error) {
    console.error("[Paddle] Resume error:", error);
    return false;
  }
}

/* ── Webhook verification ─────────────────────────────────────────────────── */

/**
 * Verifies the Paddle webhook signature using HMAC-SHA256.
 *
 * Paddle sends the signature in the `Paddle-Signature` header:
 *   `ts=<timestamp>;h1=<signature>`
 *
 * The signed payload is: `<timestamp>:<raw_body>`
 */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string,
): boolean {
  const secret = env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[Paddle] Missing webhook secret");
    return false;
  }

  try {
    // Parse signature header: ts=timestamp;h1=signature
    const parts = signatureHeader.split(";");
    const timestampPart = parts.find((p) => p.startsWith("ts="));
    const signaturePart = parts.find((p) => p.startsWith("h1="));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = timestampPart.slice(3);
    const expectedSignature = signaturePart.slice(3);

    // Compute HMAC
    const signedPayload = `${timestamp}:${rawBody}`;
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hmac, "utf8"),
      Buffer.from(expectedSignature, "utf8"),
    );
  } catch {
    return false;
  }
}

/* ── Status mapping ───────────────────────────────────────────────────────── */

/**
 * Maps a Paddle subscription status to internal subscription status.
 */
export function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
  switch (paddleStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "paused":
      return "canceled";
    case "trialing":
      return "active";
    default:
      return "incomplete";
  }
}
