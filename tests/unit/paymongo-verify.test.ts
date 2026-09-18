import { describe, expect, it } from "vitest";

import {
  parsePaymongoSignatureHeader,
  signPaymongoPayload,
  verifyPaymongoWebhook,
} from "@/lib/payments/providers/paymongo/verify";

const SECRET = "whsk_test_secret";
const BODY = JSON.stringify({ data: { id: "evt_1", type: "payment.paid" } });
const NOW = 1_700_000_000;

function headerFor(ts: number, secret: string, mode: "test" | "live"): string {
  const sig = signPaymongoPayload(BODY, String(ts), secret);
  return mode === "test" ? `t=${ts},te=${sig},li=` : `t=${ts},te=,li=${sig}`;
}

describe("paymongo webhook verification", () => {
  it("accepts a valid test signature", async () => {
    const result = await verifyPaymongoWebhook({
      rawBody: BODY,
      signatureHeader: headerFor(NOW, SECRET, "test"),
      webhookSecret: SECRET,
      environment: "test",
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: true });
  });

  it("accepts a valid live signature", async () => {
    const result = await verifyPaymongoWebhook({
      rawBody: BODY,
      signatureHeader: headerFor(NOW, SECRET, "live"),
      webhookSecret: SECRET,
      environment: "live",
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects the wrong secret and tampered bodies", async () => {
    const wrongSecret = await verifyPaymongoWebhook({
      rawBody: BODY,
      signatureHeader: headerFor(NOW, "other_secret", "test"),
      webhookSecret: SECRET,
      environment: "test",
      nowSeconds: NOW,
    });
    expect(wrongSecret).toEqual({ ok: false, reason: "signature_mismatch" });
    const tampered = await verifyPaymongoWebhook({
      rawBody: `${BODY} `,
      signatureHeader: headerFor(NOW, SECRET, "test"),
      webhookSecret: SECRET,
      environment: "test",
      nowSeconds: NOW,
    });
    expect(tampered).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("rejects a test event on a live connection and vice versa", async () => {
    const result = await verifyPaymongoWebhook({
      rawBody: BODY,
      signatureHeader: headerFor(NOW, SECRET, "test"),
      webhookSecret: SECRET,
      environment: "live",
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "missing_signature_for_environment" });
  });

  it("rejects replays outside the timestamp window", async () => {
    const old = await verifyPaymongoWebhook({
      rawBody: BODY,
      signatureHeader: headerFor(NOW - 600, SECRET, "test"),
      webhookSecret: SECRET,
      environment: "test",
      nowSeconds: NOW,
    });
    expect(old).toEqual({ ok: false, reason: "timestamp_outside_window" });
    const future = await verifyPaymongoWebhook({
      rawBody: BODY,
      signatureHeader: headerFor(NOW + 600, SECRET, "test"),
      webhookSecret: SECRET,
      environment: "test",
      nowSeconds: NOW,
    });
    expect(future).toEqual({ ok: false, reason: "timestamp_outside_window" });
  });

  it("rejects malformed headers", async () => {
    expect(
      await verifyPaymongoWebhook({ rawBody: BODY, signatureHeader: null, webhookSecret: SECRET, environment: "test", nowSeconds: NOW }),
    ).toEqual({ ok: false, reason: "malformed_signature_header" });
    expect(
      await verifyPaymongoWebhook({ rawBody: BODY, signatureHeader: "bogus", webhookSecret: SECRET, environment: "test", nowSeconds: NOW }),
    ).toEqual({ ok: false, reason: "malformed_signature_header" });
    expect(parsePaymongoSignatureHeader("t=1,te=a,li=b,zz=c")).toBeNull();
  });
});
