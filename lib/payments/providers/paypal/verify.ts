import "server-only";

import { createVerify } from "node:crypto";

import { PAYMENT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS } from "@/lib/payments/constants";
import type { ProviderEnvironment } from "@/lib/payments/types";

const CERT_URL_ALLOWLIST: Record<ProviderEnvironment, RegExp> = {
  test: /^https:\/\/(api-m\.sandbox|api\.sandbox)\.paypal\.com\/v1\/notifications\/certs\//,
  live: /^https:\/\/(api-m|api)\.paypal\.com\/v1\/notifications\/certs\//,
};

const certCache = new Map<string, string>();

/** CRC32 (IEEE) of the raw body, as an unsigned decimal — per PayPal docs. */
export function crc32UnsignedDecimal(rawBody: string): number {
  let table = crcTable;
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    crcTable = table;
  }
  let crc = 0xffffffff;
  const bytes = Buffer.from(rawBody, "utf8");
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
let crcTable: number[] | null = null;

export function paypalSignatureMessage(input: {
  transmissionId: string;
  transmissionTime: string;
  webhookId: string;
  rawBody: string;
}): string {
  return `${input.transmissionId}|${input.transmissionTime}|${input.webhookId}|${crc32UnsignedDecimal(input.rawBody)}`;
}

export function verifyPaypalSignature(input: {
  message: string;
  signatureBase64: string;
  certPem: string;
}): boolean {
  try {
    const verifier = createVerify("SHA256");
    verifier.update(input.message, "utf8");
    return verifier.verify(input.certPem, Buffer.from(input.signatureBase64, "base64"));
  } catch {
    return false;
  }
}

export type PayPalCertFetcher = (certUrl: string) => Promise<string>;

async function defaultFetchCert(certUrl: string): Promise<string> {
  const cached = certCache.get(certUrl);
  if (cached) return cached;
  const response = await fetch(certUrl);
  if (!response.ok) throw new Error(`PayPal cert fetch failed (${response.status}).`);
  const pem = await response.text();
  if (!pem.includes("BEGIN CERTIFICATE") && !pem.includes("BEGIN PUBLIC KEY"))
    throw new Error("PayPal cert response is not a certificate.");
  certCache.set(certUrl, pem);
  return pem;
}

/**
 * Local PayPal webhook verification (preferred over the API fallback):
 * allowlisted cert URL, matching webhook ID, 5-minute transmission window,
 * RSA-SHA256 over `transmissionId|time|webhookId|crc32(rawBody)`.
 */
export async function verifyPaypalWebhook(input: {
  rawBody: string;
  headers: Headers;
  webhookId: string;
  environment: ProviderEnvironment;
  nowMs?: number;
  fetchCert?: PayPalCertFetcher;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const transmissionId = input.headers.get("paypal-transmission-id");
  const transmissionTime = input.headers.get("paypal-transmission-time");
  const certUrl = input.headers.get("paypal-cert-url");
  const authAlgo = input.headers.get("paypal-auth-algo");
  const transmissionSig = input.headers.get("paypal-transmission-sig");
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig)
    return { ok: false, reason: "missing_headers" };
  if (authAlgo !== "SHA256withRSA") return { ok: false, reason: "unsupported_auth_algo" };
  if (!input.webhookId) return { ok: false, reason: "webhook_id_mismatch" };
  if (!CERT_URL_ALLOWLIST[input.environment].test(certUrl))
    return { ok: false, reason: "cert_url_rejected" };
  const transmittedAt = Date.parse(transmissionTime);
  if (Number.isNaN(transmittedAt)) return { ok: false, reason: "invalid_timestamp" };
  const now = input.nowMs ?? Date.now();
  if (Math.abs(now - transmittedAt) > PAYMENT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS * 1000)
    return { ok: false, reason: "timestamp_outside_window" };

  let certPem: string;
  try {
    certPem = await (input.fetchCert ?? defaultFetchCert)(certUrl);
  } catch {
    return { ok: false, reason: "cert_fetch_failed" };
  }
  const message = paypalSignatureMessage({
    transmissionId,
    transmissionTime,
    webhookId: input.webhookId,
    rawBody: input.rawBody,
  });
  if (!verifyPaypalSignature({ message, signatureBase64: transmissionSig, certPem }))
    return { ok: false, reason: "signature_mismatch" };
  return { ok: true };
}
