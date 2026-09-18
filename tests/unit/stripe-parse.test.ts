import { describe, expect, it } from "vitest";

import { parseStripeWebhook } from "@/lib/payments/providers/stripe/parse";

function sessionCompleted(paymentStatus: string) {
  return {
    id: "evt_cs",
    type: "checkout.session.completed",
    livemode: false,
    created: 1781000000,
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        status: "complete",
        payment_status: paymentStatus,
        amount_total: 10000,
        currency: "usd",
        created: 1781000000,
        livemode: false,
        metadata: {
          requoInvoiceId: "inv_1",
          requoInvoiceNumber: "INV-1",
          requoBusinessId: "biz_1",
          requoConnectionId: "ppc_1",
        },
        payment_intent: "pi_1",
      },
    },
  };
}

describe("stripe webhook parsing", () => {
  it("treats a paid checkout.session.completed as succeeded money", () => {
    const result = parseStripeWebhook(sessionCompleted("paid"), "test");
    expect(result.providerEventId).toBe("evt_cs");
    expect(result.snapshot).toMatchObject({
      provider: "stripe",
      environment: "test",
      providerCheckoutId: "cs_test_1",
      providerPaymentId: "pi_1",
      status: "succeeded",
      amountInCents: 10000,
      currency: "USD",
      invoiceId: "inv_1",
    });
  });

  it("does NOT treat an unpaid checkout.session.completed as paid", () => {
    const result = parseStripeWebhook(sessionCompleted("unpaid"), "test");
    expect(result.snapshot).toMatchObject({ status: "processing", providerPaymentId: "pi_1" });
  });

  it("maps async payment outcomes", () => {
    const succeeded = parseStripeWebhook(
      {
        id: "evt_async_ok",
        type: "checkout.session.async_payment_succeeded",
        livemode: false,
        data: { object: { id: "cs_test_2", status: "complete", payment_status: "paid", amount_total: 2000, currency: "usd", created: 1, livemode: false, metadata: {}, payment_intent: "pi_2" } },
      },
      "test",
    );
    expect(succeeded.snapshot).toMatchObject({ status: "succeeded", providerPaymentId: "pi_2" });
    const failed = parseStripeWebhook(
      {
        id: "evt_async_fail",
        type: "checkout.session.async_payment_failed",
        livemode: false,
        data: { object: { id: "cs_test_3", status: "complete", payment_status: "unpaid", amount_total: 2000, currency: "usd", created: 1, livemode: false, metadata: {}, payment_intent: "pi_3" } },
      },
      "test",
    );
    expect(failed.snapshot).toMatchObject({ status: "failed", providerPaymentId: "pi_3" });
  });

  it("maps payment_intent events with the intent as canonical money", () => {
    const succeeded = parseStripeWebhook(
      {
        id: "evt_pi",
        type: "payment_intent.succeeded",
        livemode: false,
        data: {
          object: {
            id: "pi_9",
            status: "succeeded",
            amount: 10000,
            currency: "usd",
            created: 1781000000,
            livemode: false,
            metadata: { requoInvoiceId: "inv_9" },
            charges: { data: [{ id: "ch_1", amount: 10000, amount_refunded: 0 }] },
          },
        },
      },
      "test",
    );
    expect(succeeded.snapshot).toMatchObject({
      providerPaymentId: "pi_9",
      status: "succeeded",
      invoiceId: "inv_9",
    });
    expect(succeeded.snapshot).not.toHaveProperty("providerCheckoutId");
    const failed = parseStripeWebhook(
      {
        id: "evt_pi_fail",
        type: "payment_intent.payment_failed",
        livemode: false,
        data: { object: { id: "pi_8", status: "requires_payment_method", amount: 100, currency: "usd", created: 1, livemode: false, metadata: {} } },
      },
      "test",
    );
    expect(failed.snapshot).toMatchObject({ providerPaymentId: "pi_8", status: "failed" });
  });

  it("maps charge.refunded through the payment intent with cumulative refund", () => {
    const result = parseStripeWebhook(
      {
        id: "evt_ch",
        type: "charge.refunded",
        livemode: false,
        data: {
          object: { id: "ch_1", amount: 10000, amount_refunded: 2500, currency: "usd", payment_intent: "pi_9", livemode: false },
        },
      },
      "test",
    );
    expect(result.snapshot).toMatchObject({
      providerPaymentId: "pi_9",
      status: "succeeded",
      amountInCents: 10000,
      refundedAmountInCents: 2500,
    });
  });

  it("ignores unhandled event types", () => {
    const result = parseStripeWebhook(
      { id: "evt_x", type: "customer.created", livemode: false, data: { object: {} } },
      "test",
    );
    expect(result.snapshot).toBeNull();
  });
});
