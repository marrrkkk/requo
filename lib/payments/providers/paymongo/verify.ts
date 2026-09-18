import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { PAYMENT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS } from "@/lib/payments/constants";
import type { ProviderEnvironment } from "@/lib/payments/types";

/**
 * PayMongo webhook verification (Setup & Management doc):
 * `Paymongo-Signature: t=<ts>,te=<hex>,li=<hex>`, HMAC-SHA256 hex of
 * `${t}.${rawBody}` with the endpoint secret (`whsk_...`). Test events carry
 * `te`, live events carry `li`. Timestamp enforced as replay protection.
 */
export function parsePaymongoSignatureHeader(header: string | null): {
  timestamp: string;
  testSignature: string;
  liveSignature: string;
} | null {
  if (!header) return null;
  let timestamp = "";
  let testSignature = "";
  let liveSignature = "";
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index <= 0) return null;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "te") testSignature = value;
    else if (key === "li") liveSignature = value;
    else return null;
  }
  if (!timestamp) return null;
  return { timestamp, testSignature, liveSignature };
}

export function signPaymongoPayload(rawBody: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function verifyPaymongoWebhook(input: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
  environment: ProviderEnvironment;
  nowSeconds?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const parsed = parsePaymongoSignatureHeader(input.signatureHeader);
  if (!parsed) return { ok: false, reason: "malformed_signature_header" };
  const expected = input.environment === "live" ? parsed.liveSignature : parsed.testSignature;
  if (!expected) return { ok: false, reason: "missing_signature_for_environment" };
  const timestampSeconds = Number(parsed.timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return { ok: false, reason: "invalid_timestamp" };
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampSeconds) > PAYMENT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS)
    return { ok: false, reason: "timestamp_outside_window" };
  const computed = signPaymongoPayload(input.rawBody, parsed.timestamp, input.webhookSecret);
  if (!safeEqualHex(computed, expected)) return { ok: false, reason: "signature_mismatch" };
  return { ok: true };
}
