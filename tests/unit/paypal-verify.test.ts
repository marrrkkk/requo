import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  crc32UnsignedDecimal,
  paypalSignatureMessage,
  verifyPaypalSignature,
  verifyPaypalWebhook,
} from "@/lib/payments/providers/paypal/verify";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const CERT_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const WEBHOOK_ID = "WH-TEST-123";
const BODY = JSON.stringify({ id: "WH-EVT-1", event_type: "PAYMENT.CAPTURE.COMPLETED" });
const TRANSMISSION_ID = "tx-1";
const TRANSMISSION_TIME = new Date("2026-06-10T12:00:00.000Z").toISOString();
const NOW_MS = Date.parse(TRANSMISSION_TIME);

function sign(message: string): string {
  const signer = createSign("SHA256");
  signer.update(message, "utf8");
  return signer.sign(privateKey, "base64");
}

function headersFor(body: string, time: string, webhookId = WEBHOOK_ID, certUrl = "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-1") {
  const message = paypalSignatureMessage({ transmissionId: TRANSMISSION_ID, transmissionTime: time, webhookId, rawBody: body });
  const headers = new Headers({
    "paypal-transmission-id": TRANSMISSION_ID,
    "paypal-transmission-time": time,
    "paypal-cert-url": certUrl,
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-transmission-sig": sign(message),
  });
  return headers;
}

describe("paypal webhook verification", () => {
  it("computes crc32 over the raw body", () => {
    expect(crc32UnsignedDecimal("")).toBe(0);
    expect(crc32UnsignedDecimal(BODY)).toBeGreaterThan(0);
    expect(crc32UnsignedDecimal(`${BODY} `)).not.toBe(crc32UnsignedDecimal(BODY));
  });

  it("accepts a valid certificate signature", async () => {
    const result = await verifyPaypalWebhook({
      rawBody: BODY,
      headers: headersFor(BODY, TRANSMISSION_TIME),
      webhookId: WEBHOOK_ID,
      environment: "test",
      nowMs: NOW_MS,
      fetchCert: async () => CERT_PEM,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects tampered bodies and wrong keys", async () => {
    const tampered = await verifyPaypalWebhook({
      rawBody: `${BODY} `,
      headers: headersFor(BODY, TRANSMISSION_TIME),
      webhookId: WEBHOOK_ID,
      environment: "test",
      nowMs: NOW_MS,
      fetchCert: async () => CERT_PEM,
    });
    expect(tampered).toEqual({ ok: false, reason: "signature_mismatch" });

    const { publicKey: other } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const wrongKey = await verifyPaypalWebhook({
      rawBody: BODY,
      headers: headersFor(BODY, TRANSMISSION_TIME),
      webhookId: WEBHOOK_ID,
      environment: "test",
      nowMs: NOW_MS,
      fetchCert: async () => other.export({ type: "spki", format: "pem" }).toString(),
    });
    expect(wrongKey).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("rejects webhook id mismatch", async () => {
    const result = await verifyPaypalWebhook({
      rawBody: BODY,
      headers: headersFor(BODY, TRANSMISSION_TIME, "WH-OTHER"),
      webhookId: WEBHOOK_ID,
      environment: "test",
      nowMs: NOW_MS,
      fetchCert: async () => CERT_PEM,
    });
    expect(result).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("rejects non-paypal certificate urls", async () => {
    const evil = await verifyPaypalWebhook({
      rawBody: BODY,
      headers: headersFor(BODY, TRANSMISSION_TIME, WEBHOOK_ID, "https://evil.example.com/certs/x"),
      webhookId: WEBHOOK_ID,
      environment: "test",
      nowMs: NOW_MS,
      fetchCert: async () => CERT_PEM,
    });
    expect(evil).toEqual({ ok: false, reason: "cert_url_rejected" });

    const liveHostOnTest = await verifyPaypalWebhook({
      rawBody: BODY,
      headers: headersFor(BODY, TRANSMISSION_TIME, WEBHOOK_ID, "https://api-m.paypal.com/v1/notifications/certs/CERT-1"),
      webhookId: WEBHOOK_ID,
      environment: "test",
      nowMs: NOW_MS,
      fetchCert: async () => CERT_PEM,
    });
    expect(liveHostOnTest).toEqual({ ok: false, reason: "cert_url_rejected" });
  });

  it("rejects stale and malformed timestamps", async () => {
    const stale = await verifyPaypalWebhook({
      rawBody: BODY,
      headers: headersFor(BODY, new Date(NOW_MS - 600_000).toISOString()),
      webhookId: WEBHOOK_ID,
      environment: "test",
      nowMs: NOW_MS,
      fetchCert: async () => CERT_PEM,
    });
    expect(stale).toEqual({ ok: false, reason: "timestamp_outside_window" });

    const headers = headersFor(BODY, TRANSMISSION_TIME);
    headers.set("paypal-auth-algo", "SHA256");
    const algo = await verifyPaypalWebhook({
      rawBody: BODY,
      headers,
      webhookId: WEBHOOK_ID,
      environment: "test",
      nowMs: NOW_MS,
      fetchCert: async () => CERT_PEM,
    });
    expect(algo).toEqual({ ok: false, reason: "unsupported_auth_algo" });
  });

  it("verifies raw signatures directly", () => {
    const message = paypalSignatureMessage({ transmissionId: "a", transmissionTime: "b", webhookId: "c", rawBody: BODY });
    expect(message).toBe(`a|b|c|${crc32UnsignedDecimal(BODY)}`);
    expect(verifyPaypalSignature({ message, signatureBase64: sign(message), certPem: CERT_PEM })).toBe(true);
    expect(verifyPaypalSignature({ message, signatureBase64: "bm90LWEtc2ln", certPem: CERT_PEM })).toBe(false);
  });
});
