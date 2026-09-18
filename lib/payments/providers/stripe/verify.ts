import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { PAYMENT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS } from "@/lib/payments/constants";
import type { ProviderEnvironment } from "@/lib/payments/types";

/**
 * Stripe webhook verification (docs.stripe.com/webhooks): header
 * `t=<ts>,v1=<hex>[,v1=<hex>...]` (v0 ignored — downgrade protection),
 * HMAC-SHA256 hex of `${t}.${rawBody}` with the endpoint secret (`whsec_...`),
 * default tolerance 5 minutes.
 */
export function parseStripeSignatureHeader(header: string | null): {
  timestamp: string;
  signatures: string[];
} | null {
  if (!header) return null;
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index <= 0) return null;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1" && value) signatures.push(value);
    else if (key !== "v0") return null;
  }
  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

export function signStripePayload(rawBody: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function verifyStripeWebhook(input: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
  environment: ProviderEnvironment;
  nowSeconds?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Stripe signatures carry no environment marker (unlike PayMongo te/li);
  // test/live isolation comes from the payload livemode in parse + engine.
  const parsed = parseStripeSignatureHeader(input.signatureHeader);
  if (!parsed) return { ok: false, reason: "malformed_signature_header" };
  const timestampSeconds = Number(parsed.timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return { ok: false, reason: "invalid_timestamp" };
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampSeconds) > PAYMENT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS)
    return { ok: false, reason: "timestamp_outside_window" };
  const computed = signStripePayload(input.rawBody, parsed.timestamp, input.webhookSecret);
  if (!parsed.signatures.some((signature) => safeEqualHex(computed, signature)))
    return { ok: false, reason: "signature_mismatch" };
  return { ok: true };
}
