import { describe, expect, it } from "vitest";

import { parsePaypalWebhook } from "@/lib/payments/providers/paypal/parse";

function captureResource(overrides: Record<string, unknown> = {}) {
  return {
    id: "CAP-1",
    status: "COMPLETED",
    amount: { currency_code: "USD", value: "100.00" },
    create_time: "2026-06-10T12:00:00Z",
    update_time: "2026-06-10T12:01:00Z",
    custom_id: "inv_1",
    supplementary_data: { related_ids: { order_id: "ORDER-1" } },
    ...overrides,
  };
}

function captureEvent(type: string, resource: Record<string, unknown>, id = "WH-1") {
  return { id, event_type: type, resource_type: "capture", create_time: "2026-06-10T12:02:00Z", resource };
}

describe("paypal webhook parsing", () => {
  it("maps capture completed to succeeded money", () => {
    const result = parsePaypalWebhook(captureEvent("PAYMENT.CAPTURE.COMPLETED", captureResource()), "test");
    expect(result.providerEventId).toBe("WH-1");
    expect(result.snapshot).toMatchObject({
      provider: "paypal",
      environment: "test",
      providerCheckoutId: "ORDER-1",
      providerPaymentId: "CAP-1",
      status: "succeeded",
      amountInCents: 10000,
      refundedAmountInCents: 0,
      currency: "USD",
    });
  });

  it("maps pending and declined captures", () => {
    const pending = parsePaypalWebhook(
      captureEvent("PAYMENT.CAPTURE.PENDING", captureResource({ status: "PENDING" })),
      "test",
    );
    expect(pending.snapshot).toMatchObject({ status: "processing", providerPaymentId: "CAP-1" });
    const denied = parsePaypalWebhook(
      captureEvent("PAYMENT.CAPTURE.DENIED", captureResource({ status: "DENIED" })),
      "test",
    );
    expect(denied.snapshot).toMatchObject({ status: "failed" });
  });

  it("never treats order approval as paid", () => {
    const result = parsePaypalWebhook(
      {
        id: "WH-APPR",
        event_type: "CHECKOUT.ORDER.APPROVED",
        create_time: "2026-06-10T12:00:00Z",
        resource: {
          id: "ORDER-9",
          status: "APPROVED",
          purchase_units: [
            { reference_id: "INV-1", custom_id: "inv_9", amount: { currency_code: "USD", value: "50.00" } },
          ],
        },
      },
      "test",
    );
    expect(result.snapshot).toMatchObject({
      providerCheckoutId: "ORDER-9",
      status: "processing",
      amountInCents: 5000,
      invoiceId: "inv_9",
    });
    expect(result.snapshot).not.toHaveProperty("providerPaymentId");
  });

  it("maps individual refund webhooks incrementally via the up link", () => {
    const result = parsePaypalWebhook(
      {
        id: "WH-REF",
        event_type: "PAYMENT.CAPTURE.REFUNDED",
        resource_type: "refund",
        create_time: "2026-06-10T13:00:00Z",
        resource: {
          id: "REF-1",
          status: "COMPLETED",
          amount: { currency_code: "USD", value: "20.00" },
          links: [
            { rel: "self", href: "https://api-m.sandbox.paypal.com/v2/payments/refunds/REF-1" },
            { rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAP-1" },
          ],
        },
      },
      "test",
    );
    expect(result.snapshot).toMatchObject({
      providerPaymentId: "CAP-1",
      status: "succeeded",
      incrementalRefundAmountInCents: 2000,
      providerRefundId: "REF-1",
    });
  });

  it("ignores unknown event types", () => {
    const result = parsePaypalWebhook(
      { id: "WH-X", event_type: "BILLING.SUBSCRIPTION.CREATED", resource: {} },
      "test",
    );
    expect(result.snapshot).toBeNull();
  });
});
