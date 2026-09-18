import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { stripeReadinessFromAccount } from "@/lib/payments/connection-status";
import {
  createAccountLink,
  createConnectedAccount,
  readinessFromAccount,
  retrieveConnectedAccount,
} from "@/lib/payments/providers/stripe/connect";
import { parseStripeWebhook } from "@/lib/payments/providers/stripe/parse";

const realFetch = globalThis.fetch;

function stubFetchJson(handler: (url: string, init: RequestInit) => unknown) {
  const seen: Array<{ url: string; init: RequestInit }> = [];
  const stub = vi.fn(async (url: unknown, init?: RequestInit) => {
    seen.push({ url: String(url), init: init ?? {} });
    return { ok: true, status: 200, json: async () => handler(String(url), init ?? {}) } as Response;
  });
  (globalThis as Record<string, unknown>).fetch = stub;
  return { stub, seen };
}

afterEach(() => {
  (globalThis as Record<string, unknown>).fetch = realFetch;
});

describe("stripe connect client", () => {
  it("creates controller-based express accounts", async () => {
    const { seen } = stubFetchJson(() => ({ id: "acct_123" }));
    const result = await createConnectedAccount({
      platformSecretKey: "sk_test_platform",
      email: "owner@example.com",
      fetchImpl: globalThis.fetch,
    });
    expect(result).toEqual({ accountId: "acct_123" });
    expect(seen[0].url).toBe("https://api.stripe.com/v1/accounts");
    const form = new URLSearchParams(String(seen[0].init.body));
    expect(form.get("controller[stripe_dashboard][type]")).toBe("express");
    expect(form.get("controller[fees][payer]")).toBe("application");
    expect(form.get("email")).toBe("owner@example.com");
    expect((seen[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_platform");
  });

  it("creates single-purpose onboarding links", async () => {
    const { seen } = stubFetchJson(() => ({ url: "https://connect.stripe.com/setup/x" }));
    const result = await createAccountLink({
      platformSecretKey: "sk_test_platform",
      accountId: "acct_123",
      returnUrl: "https://app.example.com/return",
      refreshUrl: "https://app.example.com/refresh",
      fetchImpl: globalThis.fetch,
    });
    expect(result).toEqual({ url: "https://connect.stripe.com/setup/x" });
    const form = new URLSearchParams(String(seen[0].init.body));
    expect(form.get("account")).toBe("acct_123");
    expect(form.get("type")).toBe("account_onboarding");
  });

  it("derives readiness from the retrieved account", async () => {
    stubFetchJson(() => ({
      id: "acct_123",
      charges_enabled: true,
      details_submitted: true,
      requirements: { currently_due: [] },
    }));
    const account = await retrieveConnectedAccount({
      platformSecretKey: "sk_test_platform",
      accountId: "acct_123",
      fetchImpl: globalThis.fetch,
    });
    expect(readinessFromAccount(account)).toMatchObject({ ready: true });
    expect(stripeReadinessFromAccount({ ...account, requirements: { currently_due: ["x"] } }).ready).toBe(false);
  });
});

describe("stripe adapter platform mode", () => {
  const platformCredentials = { providerAccountId: "acct_123" };

  async function loadPlatformAdapter() {
    vi.stubEnv("STRIPE_PLATFORM_SECRET_KEY", "sk_test_platform");
    vi.stubEnv("STRIPE_PLATFORM_WEBHOOK_SECRET", "whsec_platform");
    vi.resetModules();
    const mod = await import("@/lib/payments/providers/stripe/index");
    const platform = await import("@/lib/payments/providers/stripe/platform");
    expect(platform.getStripePlatformConfig()).toMatchObject({ secretKey: "sk_test_platform" });
    return mod.createStripeAdapter();
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends direct charges with the platform key and account header", async () => {
    const adapter = await loadPlatformAdapter();
    const { seen } = stubFetchJson(() => ({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
      livemode: false,
    }));
    const result = await adapter.createCheckout({
      credentials: platformCredentials,
      environment: "test",
      amountInCents: 100,
      currency: "USD",
      invoiceId: "inv_1",
      businessId: "biz_1",
      connectionId: "ppc_1",
      successUrl: "https://app.example.com/success",
      cancelUrl: "https://app.example.com/cancel",
      idempotencyKey: "cio_1",
      metadata: { requoInvoiceId: "inv_1", requoInvoiceNumber: "INV-1", requoBusinessId: "biz_1", requoConnectionId: "ppc_1" },
    });
    expect(result.providerCheckoutId).toBe("cs_test_1");
    const headers = seen[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test_platform");
    expect(headers["Stripe-Account"]).toBe("acct_123");
  });

  it("verifies platform webhooks with the platform secret", async () => {
    const adapter = await loadPlatformAdapter();
    const { signStripePayload } = await import("@/lib/payments/providers/stripe/verify");
    const body = JSON.stringify({ id: "evt_1", type: "payment_intent.succeeded" });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signStripePayload(body, ts, "whsec_platform");
    const result = await adapter.verifyWebhook({
      rawBody: body,
      headers: new Headers({ "stripe-signature": `t=${ts},v1=${sig}` }),
      credentials: platformCredentials,
      environment: "test",
    });
    expect(result).toEqual({ ok: true });
  });

  it("carries the connected account from Connect events into snapshots", () => {
    const result = parseStripeWebhook(
      {
        id: "evt_1",
        type: "payment_intent.succeeded",
        account: "acct_123",
        livemode: false,
        data: { object: { id: "pi_1", status: "succeeded", amount: 100, currency: "usd", created: 1, livemode: false, metadata: {} } },
      },
      "test",
    );
    expect(result.snapshot).toMatchObject({ providerPaymentId: "pi_1", providerAccountId: "acct_123" });
  });
});
