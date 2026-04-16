import "server-only";

/**
 * PayMongo provider client for QRPh payments.
 *
 * Uses the PayMongo REST API directly (no SDK dependency).
 * QRPh flow:
 *   1. Create a Payment Intent with `qrph` allowed
 *   2. Create a Payment Method with type `qrph`
 *   3. Attach the method → get QR code data
 *   4. User scans QR → webhook fires on completion
 */

import crypto from "crypto";

import { env } from "@/lib/env";
import type { CheckoutResult, PaidPlan } from "@/lib/billing/types";
import { getPlanPrice } from "@/lib/billing/plans";

const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

function getAuthHeader(): string {
  return `Basic ${Buffer.from(`${env.PAYMONGO_SECRET_KEY}:`).toString("base64")}`;
}

async function paymongoRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${PAYMONGO_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `PayMongo API error ${response.status}: ${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}

/* ── Payment Intent + QR Ph ───────────────────────────────────────────────── */

type PayMongoPaymentIntentResponse = {
  data: {
    id: string;
    attributes: {
      amount: number;
      currency: string;
      status: string;
      client_key: string;
      next_action?: {
        type: string;
        redirect?: { url: string };
      };
      payments: Array<{
        id: string;
        attributes: {
          status: string;
        };
      }>;
    };
  };
};

type PayMongoPaymentMethodResponse = {
  data: {
    id: string;
    attributes: {
      type: string;
    };
  };
};

type PayMongoAttachResponse = {
  data: {
    id: string;
    attributes: {
      status: string;
      next_action?: {
        type: string;
        redirect?: { url: string };
        code?: {
          url?: string;
          test_url?: string;
          image_url?: string;
        };
      };
    };
  };
};

/**
 * Creates a QRPh checkout flow:
 *   1. Create Payment Intent
 *   2. Create QRPh Payment Method
 *   3. Attach method to intent → returns QR data URL
 */
export async function createQrPhCheckout(params: {
  plan: PaidPlan;
  workspaceId: string;
  description?: string;
}): Promise<CheckoutResult> {
  const amount = getPlanPrice(params.plan, "PHP");

  try {
    // 1. Create payment intent
    const intentResponse =
      await paymongoRequest<PayMongoPaymentIntentResponse>(
        "POST",
        "/payment_intents",
        {
          data: {
            attributes: {
              amount,
              payment_method_allowed: ["qrph"],
              currency: "PHP",
              description:
                params.description ??
                `Requo ${params.plan === "pro" ? "Pro" : "Business"} plan — 1 month`,
              metadata: {
                workspace_id: params.workspaceId,
                plan: params.plan,
              },
            },
          },
        },
      );

    const paymentIntentId = intentResponse.data.id;
    const clientKey = intentResponse.data.attributes.client_key;

    // 2. Create payment method
    const methodResponse =
      await paymongoRequest<PayMongoPaymentMethodResponse>(
        "POST",
        "/payment_methods",
        {
          data: {
            attributes: {
              type: "qrph",
            },
          },
        },
      );

    const paymentMethodId = methodResponse.data.id;

    // 3. Attach payment method to intent
    const attachResponse = await paymongoRequest<PayMongoAttachResponse>(
      "POST",
      `/payment_intents/${paymentIntentId}/attach`,
      {
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
            return_url: `${env.BETTER_AUTH_URL}/workspaces`,
          },
        },
      },
    );

    const nextAction = attachResponse.data.attributes.next_action;
    const redirectUrl =
      nextAction?.redirect?.url ??
      nextAction?.code?.url ??
      nextAction?.code?.test_url;

    if (redirectUrl) {
      return {
        type: "qrph",
        qrCodeData: redirectUrl,
        paymentIntentId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        amount,
        currency: "PHP",
      };
    }

    return {
      type: "error",
      message: "Failed to generate QR code. Please try again.",
    };
  } catch (error) {
    console.error("[PayMongo] QRPh checkout error:", error);
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
 * Retrieves a Payment Intent to check its status.
 */
export async function getPaymentIntent(
  paymentIntentId: string,
): Promise<PayMongoPaymentIntentResponse["data"] | null> {
  try {
    const response =
      await paymongoRequest<PayMongoPaymentIntentResponse>(
        "GET",
        `/payment_intents/${paymentIntentId}`,
      );
    return response.data;
  } catch {
    return null;
  }
}

/* ── Webhook verification ─────────────────────────────────────────────────── */

/**
 * Verifies the PayMongo webhook signature.
 *
 * PayMongo signs webhooks using the webhook secret. The signature header
 * contains a timestamp and signature separated by commas:
 *   `t=<timestamp>,te=<test_signature>,li=<live_signature>`
 */
export function verifyPayMongoWebhookSignature(
  rawBody: string,
  signatureHeader: string,
): boolean {
  const secret = env.PAYMONGO_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[PayMongo] Missing webhook secret");
    return false;
  }

  try {
    // Parse signature header
    const parts = signatureHeader.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const liveSigPart = parts.find((p) => p.startsWith("li="));
    const testSigPart = parts.find((p) => p.startsWith("te="));

    if (!timestampPart) {
      return false;
    }

    const timestamp = timestampPart.slice(2);
    const sigToCheck = liveSigPart?.slice(3) || testSigPart?.slice(3);

    if (!sigToCheck) {
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, "utf8"),
      Buffer.from(sigToCheck, "utf8"),
    );
  } catch {
    return false;
  }
}

/* ── Status mapping ───────────────────────────────────────────────────────── */

/**
 * Maps a PayMongo payment intent status to internal subscription status.
 */
export function mapPayMongoStatus(
  paymongoStatus: string,
): "pending" | "active" | "failed" | "expired" {
  switch (paymongoStatus) {
    case "succeeded":
      return "active";
    case "awaiting_payment_method":
    case "awaiting_next_action":
    case "processing":
      return "pending";
    case "expired":
      return "expired";
    default:
      return "failed";
  }
}
