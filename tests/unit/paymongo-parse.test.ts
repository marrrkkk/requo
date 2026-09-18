import { describe, expect, it } from "vitest";

import { parsePaymongoWebhook } from "@/lib/payments/providers/paymongo/parse";

function checkoutPaidPayload() {
  return {
    data: {
      id: "evt_cs_paid",
      type: "checkout_session.payment.paid",
      resource: "checkout_session",
      livemode: false,
      created_at: "2026-06-10T00:00:01Z",
      attributes: {
        reference_number: "INV-000012",
        metadata: {
          requoInvoiceId: "inv_1",
          requoInvoiceNumber: "INV-000012",
          requoBusinessId: "biz_1",
          requoConnectionId: "ppc_1",
        },
        payment_intent: { id: "pi_1" },
        payments: [
          {
            id: "pay_1",
            attributes: {
              amount: 10000,
              currency: "php",
              status: "paid",
              livemode: false,
              paid_at: 1781000000,
              created_at: 1780999900,
              updated_at: 1781000000,
              refunds: [],
            },
          },
        ],
      },
    },
  };
}

describe("paymongo webhook parsing", () => {
  it("maps checkout_session.payment.paid to succeeded money", () => {
    const result = parsePaymongoWebhook(checkoutPaidPayload(), "test");
    expect(result.rawType).toBe("checkout_session.payment.paid");
    expect(result.providerEventId).toBe("evt_cs_paid");
    expect(result.snapshot).toMatchObject({
      provider: "paymongo",
      environment: "test",
      providerCheckoutId: "evt_cs_paid",
      providerPaymentId: "pay_1",
      status: "succeeded",
      amountInCents: 10000,
      refundedAmountInCents: 0,
      currency: "PHP",
      invoiceId: "inv_1",
      businessId: "biz_1",
      connectionId: "ppc_1",
    });
    expect(result.snapshot?.occurredAt).toBeInstanceOf(Date);
  });

  it("maps payment.failed to failed", () => {
    const result = parsePaymongoWebhook(
      {
        data: {
          id: "evt_fail",
          type: "payment.failed",
          resource: "payment",
          livemode: false,
          attributes: {
            amount: 5000,
            currency: "PHP",
            status: "failed",
            checkout_session_id: "cs_9",
            created_at: 1781000000,
            updated_at: 1781000010,
            refunds: [],
          },
        },
      },
      "test",
    );
    expect(result.snapshot).toMatchObject({
      providerPaymentId: "evt_fail",
      providerCheckoutId: "cs_9",
      status: "failed",
      amountInCents: 5000,
    });
  });

  it("derives cumulative refunds from the payment refunds array", () => {
    const result = parsePaymongoWebhook(
      {
        data: {
          id: "pay_2",
          type: "payment.refunded",
          resource: "payment",
          livemode: false,
          attributes: {
            amount: 10000,
            currency: "PHP",
            status: "paid",
            paid_at: 1781000000,
            refunds: [{ id: "ref_1", amount: 2000 }, { id: "ref_2", attributes: { amount: 3000 } }],
          },
        },
      },
      "test",
    );
    expect(result.snapshot).toMatchObject({
      providerPaymentId: "pay_2",
      status: "succeeded",
      amountInCents: 10000,
      refundedAmountInCents: 5000,
    });
  });

  it("reads livemode from the payload for environment isolation", () => {
    const result = parsePaymongoWebhook(checkoutPaidPayload(), "live");
    expect(result.snapshot?.environment).toBe("test");
    const live = parsePaymongoWebhook(
      {
        data: {
          id: "pay_live",
          type: "payment.paid",
          resource: "payment",
          livemode: true,
          attributes: { amount: 100, currency: "PHP", status: "paid", refunds: [] },
        },
      },
      "live",
    );
    expect(live.snapshot?.environment).toBe("live");
  });

  it("ignores unknown event types", () => {
    const result = parsePaymongoWebhook(
      { data: { id: "evt_x", type: "payout.paid", resource: "payout", livemode: false, attributes: {} } },
      "test",
    );
    expect(result.snapshot).toBeNull();
  });
});
