import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPayMongoAdapter } from "@/lib/payments/providers/paymongo";

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
  credentials: { secretKey: "sk_test_x", webhookSecret: "whsk_test_x" },
  environment: "test" as const,
  amountInCents: 10000,
  currency: "php",
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

describe("paymongo adapter http", () => {
  it("creates a v2 checkout with basic auth, idempotency, and metadata", async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    stubFetchJson(
      { data: { id: "cs_123", attributes: { checkout_url: "https://checkout.paymongo.com/cs_123", livemode: false } } },
      seen,
    );
    const result = await createPayMongoAdapter().createCheckout(checkoutInput);
    expect(result).toEqual({ checkoutUrl: "https://checkout.paymongo.com/cs_123", providerCheckoutId: "cs_123" });
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe("https://api.paymongo.com/v2/checkout_sessions");
    const headers = seen[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("sk_test_x:").toString("base64")}`);
    expect(headers["Idempotency-Key"]).toBe("cio_1");
    const body = JSON.parse(String(seen[0].init.body));
    expect(body.data.attributes.pass_on_fees).toBe(false);
    expect(body.data.attributes.reference_number).toBe("INV-000012");
    expect(body.data.attributes.metadata.requoInvoiceId).toBe("inv_1");
    expect(body.data.attributes.line_items[0]).toMatchObject({ amount: 10000, currency: "PHP", quantity: 1 });
  });

  it("rejects a session whose livemode does not match the connection", async () => {
    stubFetchJson(
      { data: { id: "cs_live", attributes: { checkout_url: "https://checkout.paymongo.com/cs_live", livemode: true } } },
    );
    await expect(createPayMongoAdapter().createCheckout(checkoutInput)).rejects.toThrow(/environment/);
  });

  it("retrieves a payment and a session for refresh", async () => {
    const payStub = stubFetchJson({
      data: { id: "pay_1", attributes: { amount: 10000, currency: "PHP", status: "paid", livemode: false, paid_at: 1781000000, refunds: [] } },
    });
    const payment = await createPayMongoAdapter().getPayment({
      credentials: checkoutInput.credentials,
      environment: "test",
      providerPaymentId: "pay_1",
    });
    expect(payStub).toHaveBeenCalledOnce();
    expect(String((payStub.mock.calls[0] as unknown[])[0])).toBe("https://api.paymongo.com/v1/payments/pay_1");
    expect(payment).toMatchObject({ providerPaymentId: "pay_1", status: "succeeded" });

    stubFetchJson({
      data: { id: "cs_9", attributes: { status: "expired", livemode: false, line_items: [{ amount: 10000, currency: "PHP", quantity: 1 }], metadata: {} } },
    });
    const session = await createPayMongoAdapter().getPayment({
      credentials: checkoutInput.credentials,
      environment: "test",
      providerPaymentId: "cs_9",
    });
    expect(session).toMatchObject({ providerCheckoutId: "cs_9", status: "canceled" });
  });

  it("creates refunds against the payment id with an idempotency key", async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    stubFetchJson({ data: { id: "ref_1", attributes: { amount: 2000 } } }, seen);
    const result = await createPayMongoAdapter().refundPayment({
      credentials: checkoutInput.credentials,
      environment: "test",
      providerPaymentId: "pay_1",
      amountInCents: 2000,
      idempotencyKey: "ref_1",
    });
    expect(result).toEqual({ accepted: true, providerRefundId: "ref_1" });
    expect(seen[0].url).toBe("https://api.paymongo.com/v1/refunds");
    const body = JSON.parse(String(seen[0].init.body));
    expect(body.data.attributes).toMatchObject({ amount: 2000, payment_id: "pay_1", reason: "requested_by_customer" });
    expect((seen[0].init.headers as Record<string, string>)["Idempotency-Key"]).toBe("ref_1");
  });
});
