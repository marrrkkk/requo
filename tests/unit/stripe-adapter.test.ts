import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createStripeAdapter } from "@/lib/payments/providers/stripe";

const realFetch = globalThis.fetch;

function stubFetchJson(body: unknown, seen?: Array<{ url: string; init: RequestInit }>) {
  const stub = vi.fn(async (url: unknown, init?: RequestInit) => {
    seen?.push({ url: String(url), init: init ?? {} });
    return { ok: true, status: 200, json: async () => body } as Response;
  });
  (globalThis as Record<string, unknown>).fetch = stub;
  return stub;
}

afterEach(() => {
  (globalThis as Record<string, unknown>).fetch = realFetch;
});

const checkoutInput = {
  credentials: { secretKey: "sk_test_x", webhookSecret: "whsec_x" },
  environment: "test" as const,
  amountInCents: 10000,
  currency: "USD",
  invoiceId: "inv_1",
  businessId: "biz_1",
  connectionId: "ppc_1",
  successUrl: "https://app.example.com/pay/return?status=success",
  cancelUrl: "https://app.example.com/pay/return?status=cancelled",
  idempotencyKey: "cio_1",
  metadata: {
    requoInvoiceId: "inv_1",
    requoInvoiceNumber: "INV-000012",
    requoBusinessId: "biz_1",
    requoConnectionId: "ppc_1",
  },
};

describe("stripe adapter http", () => {
  it("creates a checkout session form-encoded with metadata on session and intent", async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    stubFetchJson(
      { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1", livemode: false },
      seen,
    );
    const result = await createStripeAdapter().createCheckout(checkoutInput);
    expect(result).toEqual({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
      providerCheckoutId: "cs_test_1",
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const headers = seen[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test_x");
    expect(headers["Idempotency-Key"]).toBe("cio_1");
    const form = new URLSearchParams(String(seen[0].init.body));
    expect(form.get("mode")).toBe("payment");
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("10000");
    expect(form.get("line_items[0][price_data][currency]")).toBe("usd");
    expect(form.get("metadata[requoInvoiceId]")).toBe("inv_1");
    expect(form.get("payment_intent_data[metadata][requoInvoiceId]")).toBe("inv_1");
    expect(form.get("client_reference_id")).toBe("INV-000012");
  });

  it("rejects a live key on a test connection", async () => {
    stubFetchJson({ id: "cs_x", url: "https://checkout.stripe.com/x", livemode: true });
    await expect(
      createStripeAdapter().createCheckout({
        ...checkoutInput,
        credentials: { secretKey: "sk_live_x", webhookSecret: "whsec_x" },
      }),
    ).rejects.toThrow(/environment/);
  });

  it("retrieves intents and sessions for refresh", async () => {
    stubFetchJson({
      id: "pi_1",
      status: "succeeded",
      amount: 10000,
      currency: "usd",
      created: 1781000000,
      livemode: false,
      metadata: {},
      charges: { data: [{ id: "ch_1", amount: 10000, amount_refunded: 2000 }] },
    });
    const intent = await createStripeAdapter().getPayment({
      credentials: checkoutInput.credentials,
      environment: "test",
      providerPaymentId: "pi_1",
    });
    expect(intent).toMatchObject({ providerPaymentId: "pi_1", status: "succeeded", refundedAmountInCents: 2000 });

    stubFetchJson({
      id: "cs_test_9",
      status: "open",
      payment_status: "unpaid",
      amount_total: 5000,
      currency: "usd",
      created: 1781000000,
      livemode: false,
      metadata: {},
      payment_intent: null,
    });
    const session = await createStripeAdapter().getPayment({
      credentials: checkoutInput.credentials,
      environment: "test",
      providerPaymentId: "cs_test_9",
    });
    expect(session).toMatchObject({ providerCheckoutId: "cs_test_9", status: "pending" });
  });

  it("creates refunds against the payment intent with an idempotency key", async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    stubFetchJson({ id: "re_1" }, seen);
    const result = await createStripeAdapter().refundPayment({
      credentials: checkoutInput.credentials,
      environment: "test",
      providerPaymentId: "pi_1",
      amountInCents: 2000,
      idempotencyKey: "ref_1",
    });
    expect(result).toEqual({ accepted: true, providerRefundId: "re_1" });
    expect(seen[0].url).toBe("https://api.stripe.com/v1/refunds");
    const form = new URLSearchParams(String(seen[0].init.body));
    expect(form.get("payment_intent")).toBe("pi_1");
    expect(form.get("amount")).toBe("2000");
    expect((seen[0].init.headers as Record<string, string>)["Idempotency-Key"]).toBe("ref_1");
  });
});
