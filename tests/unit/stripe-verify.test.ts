import { describe, expect, it } from "vitest";

import {
  parseStripeSignatureHeader,
  signStripePayload,
  verifyStripeWebhook,
} from "@/lib/payments/providers/stripe/verify";

const SECRET = "whsec_test_secret";
const BODY = JSON.stringify({ id: "evt_1", type: "payment_intent.succeeded" });
const NOW = 1_700_000_000;

function headerFor(ts: number, secret: string, extra = ""): string {
  const sig = signStripePayload(BODY, String(ts), secret);
  return `t=${ts},v1=${sig}${extra}`;
}

describe("stripe webhook verification", () => {
  it("accepts a valid v1 signature", async () => {
    const result = await verifyStripeWebhook({
      rawBody: BODY,
      signatureHeader: headerFor(NOW, SECRET),
      webhookSecret: SECRET,
      environment: "test",
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: true });
  });

  it("accepts any matching v1 among several and ignores v0", async () => {
    const good = signStripePayload(BODY, String(NOW), SECRET);
    const header = `t=${NOW},v1=deadbeef,v1=${good},v0=fake`;
    const result = await verifyStripeWebhook({
      rawBody: BODY,
      signatureHeader: header,
      webhookSecret: SECRET,
      environment: "live",
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects wrong secrets and tampered bodies", async () => {
    const wrong = await verifyStripeWebhook({
      rawBody: BODY,
      signatureHeader: headerFor(NOW, "whsec_other"),
      webhookSecret: SECRET,
      environment: "test",
      nowSeconds: NOW,
    });
    expect(wrong).toEqual({ ok: false, reason: "signature_mismatch" });
    const tampered = await verifyStripeWebhook({
      rawBody: `${BODY} `,
      signatureHeader: headerFor(NOW, SECRET),
      webhookSecret: SECRET,
      environment: "test",
      nowSeconds: NOW,
    });
    expect(tampered).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("rejects replays outside the window", async () => {
    const old = await verifyStripeWebhook({
      rawBody: BODY,
      signatureHeader: headerFor(NOW - 600, SECRET),
      webhookSecret: SECRET,
      environment: "test",
      nowSeconds: NOW,
    });
    expect(old).toEqual({ ok: false, reason: "timestamp_outside_window" });
  });

  it("rejects malformed headers", async () => {
    expect(
      await verifyStripeWebhook({ rawBody: BODY, signatureHeader: null, webhookSecret: SECRET, environment: "test", nowSeconds: NOW }),
    ).toEqual({ ok: false, reason: "malformed_signature_header" });
    expect(
      await verifyStripeWebhook({ rawBody: BODY, signatureHeader: "t=123", webhookSecret: SECRET, environment: "test", nowSeconds: NOW }),
    ).toEqual({ ok: false, reason: "malformed_signature_header" });
    expect(
      await verifyStripeWebhook({ rawBody: BODY, signatureHeader: "t=123,v0=only", webhookSecret: SECRET, environment: "test", nowSeconds: NOW }),
    ).toEqual({ ok: false, reason: "malformed_signature_header" });
    expect(parseStripeSignatureHeader("t=1,v1=a,bogus")).toBeNull();
  });
});
