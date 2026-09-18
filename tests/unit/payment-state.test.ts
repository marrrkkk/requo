import { describe, expect, it } from "vitest";

import {
  clampRefundedAmount,
  deriveEffectiveStatus,
  isValidPaymentTransition,
} from "@/lib/payments/payment-state";

describe("payment state machine", () => {
  it("advances pending through processing to succeeded", () => {
    expect(isValidPaymentTransition("pending", "processing")).toBe(true);
    expect(isValidPaymentTransition("processing", "succeeded")).toBe(true);
    expect(isValidPaymentTransition("pending", "succeeded")).toBe(true);
  });

  it("ends in failed, canceled, or refunded", () => {
    expect(isValidPaymentTransition("pending", "failed")).toBe(true);
    expect(isValidPaymentTransition("processing", "canceled")).toBe(true);
    expect(isValidPaymentTransition("succeeded", "refunded")).toBe(true);
    expect(isValidPaymentTransition("partially_refunded", "refunded")).toBe(true);
  });

  it("never downgrades: succeeded ignores stale processing or failure", () => {
    expect(isValidPaymentTransition("succeeded", "processing")).toBe(false);
    expect(isValidPaymentTransition("succeeded", "failed")).toBe(false);
    expect(isValidPaymentTransition("succeeded", "pending")).toBe(false);
    expect(isValidPaymentTransition("refunded", "succeeded")).toBe(false);
    expect(isValidPaymentTransition("failed", "succeeded")).toBe(false);
    expect(isValidPaymentTransition("canceled", "processing")).toBe(false);
  });

  it("treats same-state redelivery as valid", () => {
    for (const s of ["pending", "processing", "succeeded", "failed", "canceled", "partially_refunded", "refunded"] as const) {
      expect(isValidPaymentTransition(s, s)).toBe(true);
    }
  });

  it("derives refund states from the cumulative refunded amount", () => {
    expect(deriveEffectiveStatus("succeeded", 10000, 0)).toBe("succeeded");
    expect(deriveEffectiveStatus("succeeded", 10000, 2000)).toBe("partially_refunded");
    expect(deriveEffectiveStatus("succeeded", 10000, 10000)).toBe("refunded");
    expect(deriveEffectiveStatus("pending", 10000, 0)).toBe("pending");
    expect(deriveEffectiveStatus("failed", 10000, 0)).toBe("failed");
  });

  it("clamps refunds into 0..amount", () => {
    expect(clampRefundedAmount(10000, 2000)).toBe(2000);
    expect(clampRefundedAmount(10000, 99999)).toBe(10000);
    expect(clampRefundedAmount(10000, -5)).toBe(0);
    expect(clampRefundedAmount(10000, Number.NaN)).toBe(0);
  });
});
