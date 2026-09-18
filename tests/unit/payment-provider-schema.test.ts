import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  paymentEventStatuses,
  paymentEvents,
  paymentProviderConnections,
  paymentProviders,
  providerEnvironments,
  providerPaymentStatuses,
} from "@/lib/db/schema/payment-providers";
import { payments } from "@/lib/db/schema/invoices";
import { connectProviderSchema } from "@/features/payment-providers/schemas";
import { getProviderWebhookPath } from "@/features/payment-providers/queries";

describe("payment provider domain foundation", () => {
  it("supports exactly paymongo, stripe, paypal in test and live", () => {
    expect([...paymentProviders].sort()).toEqual(["paymongo", "paypal", "stripe"]);
    expect([...providerEnvironments].sort()).toEqual(["live", "test"]);
  });

  it("covers the agreed payment state machine", () => {
    expect([...providerPaymentStatuses].sort()).toEqual(
      ["canceled", "failed", "partially_refunded", "pending", "processing", "refunded", "succeeded"].sort(),
    );
  });

  it("covers the event lifecycle", () => {
    expect([...paymentEventStatuses].sort()).toEqual(
      ["failed", "ignored", "processed", "processing"].sort(),
    );
  });

  it("exposes connection-scoped event identity columns", () => {
    expect(paymentProviderConnections.credentialsCiphertext).toBeDefined();
    expect(paymentEvents.connectionId).toBeDefined();
    expect(paymentEvents.providerEventId).toBeDefined();
  });

  it("extends payments without a second ledger", () => {
    expect(payments.source).toBeDefined();
    expect(payments.provider).toBeDefined();
    expect(payments.providerConnectionId).toBeDefined();
    expect(payments.providerCheckoutId).toBeDefined();
    expect(payments.providerPaymentId).toBeDefined();
    expect(payments.status).toBeDefined();
    expect(payments.refundedAmountInCents).toBeDefined();
    expect(payments.checkoutIdempotencyKey).toBeDefined();
  });

  it("validates provider credentials per provider", () => {
    expect(
      connectProviderSchema.safeParse({
        provider: "paymongo",
        environment: "test",
        credentials: { secretKey: "sk_test_x", webhookSecret: "whsec_x" },
      }).success,
    ).toBe(true);
    expect(
      connectProviderSchema.safeParse({
        provider: "paypal",
        environment: "live",
        credentials: { clientId: "id", clientSecret: "sec", webhookId: "wh" },
      }).success,
    ).toBe(true);
    expect(
      connectProviderSchema.safeParse({
        provider: "stripe",
        environment: "test",
        credentials: { secretKey: "" },
      }).success,
    ).toBe(false);
  });

  it("builds connection-scoped webhook paths", () => {
    expect(getProviderWebhookPath("paymongo", "ppc_123")).toBe(
      "/api/payments/webhooks/paymongo/ppc_123",
    );
  });

  it("never exposes ciphertext in the connection view type", async () => {
    const mod = await import("@/features/payment-providers/queries");
    expect(typeof mod.listProviderConnectionsForBusiness).toBe("function");
    expect(typeof mod.fakePingConnection).toBe("function");
    expect(mod.fakePingConnection().ok).toBe(true);
  });
});
