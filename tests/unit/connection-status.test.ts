import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  connectionStatusForCapability,
  providerOperationBlocked,
  stripeReadinessFromAccount,
} from "@/lib/payments/connection-status";
import {
  connectionAuthModes,
  connectionStatuses,
  paymentProviderConnections,
} from "@/lib/db/schema/payment-providers";

describe("connection status model", () => {
  it("covers onboarding, action_required, ready, revoked — nothing else", () => {
    expect([...connectionStatuses].sort()).toEqual(
      ["action_required", "onboarding", "ready", "revoked"].sort(),
    );
    expect([...connectionAuthModes].sort()).toEqual(["byo", "platform"].sort());
  });

  it("exposes account, status, and auth-mode columns", () => {
    expect(paymentProviderConnections.providerAccountId).toBeDefined();
    expect(paymentProviderConnections.status).toBeDefined();
    expect(paymentProviderConnections.authMode).toBeDefined();
  });

  it("derives Stripe readiness without payouts_enabled", () => {
    const ready = stripeReadinessFromAccount({
      charges_enabled: true,
      details_submitted: true,
      requirements: { currently_due: [] },
    });
    expect(ready).toMatchObject({ ready: true, paymentsReady: true, refundsReady: true });

    expect(
      stripeReadinessFromAccount({ charges_enabled: false, details_submitted: true, requirements: { currently_due: [] } }).ready,
    ).toBe(false);
    expect(
      stripeReadinessFromAccount({ charges_enabled: true, details_submitted: false, requirements: { currently_due: [] } }).ready,
    ).toBe(false);
    expect(
      stripeReadinessFromAccount({ charges_enabled: true, details_submitted: true, requirements: { currently_due: ["business_profile.url"] } }).ready,
    ).toBe(false);
    // Payout hold never blocks accepting money.
    expect(
      stripeReadinessFromAccount({ charges_enabled: true, details_submitted: true, requirements: { currently_due: [] } }),
    ).toMatchObject({ ready: true });
  });

  it("maps capability to status", () => {
    expect(connectionStatusForCapability({ ready: true })).toBe("ready");
    expect(connectionStatusForCapability({ ready: false })).toBe("action_required");
  });

  it("allows operations only on ready connections", () => {
    expect(providerOperationBlocked({ status: "ready" })).toBeNull();
    expect(providerOperationBlocked({ status: "revoked" })).toMatch(/revoked/i);
    expect(providerOperationBlocked({ status: "onboarding" })).toMatch(/incomplete/i);
    expect(providerOperationBlocked({ status: "action_required" })).toMatch(/incomplete/i);
  });
});
