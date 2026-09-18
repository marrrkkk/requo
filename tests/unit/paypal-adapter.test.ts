import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { clearPaypalTokenCache } from "@/lib/payments/providers/paypal/client";
import { createPayPalAdapter } from "@/lib/payments/providers/paypal";

const realFetch = globalThis.fetch;

function stubFetchJson(handler: (url: string, init: RequestInit) => unknown) {
  const stub = vi.fn(async (url: unknown, init?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () => handler(String(url), init ?? {}),
  }) as Response);
  (globalThis as Record<string, unknown>).fetch = stub;
  return stub;
}

afterEach(() => {
  (globalThis as Record<string, unknown>).fetch = realFetch;
  clearPaypalTokenCache();
});

const credentials = { clientId: "cid", clientSecret: "csec", webhookId: "WH-ID" };

const checkoutInput = {
  credentials,
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

function tokenThen(handler: (url: string, init: RequestInit) => unknown) {
  return stubFetchJson((url, init) =>
    url.endsWith("/v1/oauth2/token")
      ? { access_token: "tok", expires_in: 3600 }
      : handler(url, init),
  );
}

describe("paypal adapter http", () => {
  it("creates an order and returns the approval link", async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    tokenThen((url, init) => {
      seen.push({ url, init });
      return {
        id: "ORDER-1",
        status: "PAYER_ACTION_REQUIRED",
        links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1" }],
      };
    });
    const result = await createPayPalAdapter().createCheckout(checkoutInput);
    expect(result).toEqual({
      checkoutUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1",
      providerCheckoutId: "ORDER-1",
    });
    const create = seen.find((s) => s.url.endsWith("/v2/checkout/orders"));
    expect(create).toBeDefined();
    const headers = create!.init.headers as Record<string, string>;
    expect(headers["PayPal-Request-Id"]).toBe("cio_1");
    const body = JSON.parse(String(create!.init.body));
    expect(body.intent).toBe("CAPTURE");
    expect(body.purchase_units[0]).toMatchObject({
      custom_id: "inv_1",
      invoice_id: "INV-000012",
      amount: { currency_code: "USD", value: "100.00" },
    });
    expect(body.application_context.return_url).toContain("/pay/return");
  });

  it("captures an approved order via fulfillCheckout", async () => {
    tokenThen((url) => {
      if (url.endsWith("/v2/checkout/orders/ORDER-1/capture")) {
        return {
          id: "ORDER-1",
          status: "COMPLETED",
          purchase_units: [
            { payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "100.00" }, update_time: "2026-06-10T12:01:00Z" }] } },
          ],
        };
      }
      throw new Error(`unexpected ${url}`);
    });
    const adapter = createPayPalAdapter();
    const snapshot = await adapter.fulfillCheckout!({
      credentials,
      environment: "test",
      snapshot: {
        provider: "paypal",
        environment: "test",
        providerCheckoutId: "ORDER-1",
        status: "processing",
        amountInCents: 10000,
        refundedAmountInCents: 0,
        currency: "USD",
        invoiceId: "inv_1",
      },
      idempotencyKey: "cap-ORDER-1",
    });
    expect(snapshot).toMatchObject({ providerPaymentId: "CAP-1", status: "succeeded", amountInCents: 10000 });
  });

  it("skips fulfillment once money is known", async () => {
    const stub = tokenThen(() => {
      throw new Error("must not call");
    });
    const snapshot = await createPayPalAdapter().fulfillCheckout!({
      credentials,
      environment: "test",
      snapshot: {
        provider: "paypal",
        environment: "test",
        providerCheckoutId: "ORDER-1",
        providerPaymentId: "CAP-1",
        status: "succeeded",
        amountInCents: 10000,
        refundedAmountInCents: 0,
        currency: "USD",
      },
      idempotencyKey: "x",
    });
    expect(snapshot).toBeNull();
    expect(stub).not.toHaveBeenCalled();
  });

  it("creates capture refunds with PayPal-Request-Id", async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    tokenThen((url, init) => {
      seen.push({ url, init });
      return { id: "REF-1", status: "COMPLETED" };
    });
    const result = await createPayPalAdapter().refundPayment({
      credentials,
      environment: "test",
      providerPaymentId: "CAP-1",
      amountInCents: 2000,
      idempotencyKey: "ref_1",
    });
    expect(result).toEqual({ accepted: true, providerRefundId: "REF-1" });
    const refund = seen.find((s) => s.url.endsWith("/v2/payments/captures/CAP-1/refund"));
    expect(refund).toBeDefined();
    expect(JSON.parse(String(refund!.init.body))).toMatchObject({
      amount: { currency_code: "USD", value: "20.00" },
    });
    expect((refund!.init.headers as Record<string, string>)["PayPal-Request-Id"]).toBe("ref_1");
  });

  it("falls back from capture to order retrieval for refresh", async () => {
    tokenThen((url) => {
      if (url.endsWith("/v2/payments/captures/ORDER-9")) {
        const error = new Error("not found") as Error & { status?: number };
        error.status = 404;
        throw error;
      }
      return { id: "ORDER-9", status: "APPROVED", purchase_units: [{ custom_id: "inv_9", amount: { currency_code: "USD", value: "50.00" } }] };
    });
    const snapshot = await createPayPalAdapter().getPayment({
      credentials,
      environment: "test",
      providerPaymentId: "ORDER-9",
    });
    expect(snapshot).toMatchObject({ providerCheckoutId: "ORDER-9", status: "pending" });
  });
});
