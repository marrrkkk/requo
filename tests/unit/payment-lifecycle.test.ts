import { describe, expect, it } from "vitest";

import { getVoidReasonLabel, normalizeVoidReason } from "@/features/invoices/mutations";
import { paymentSchema, voidPaymentSchema } from "@/features/invoices/schemas";

describe("payment void reasons", () => {
  it("normalizes enum values with optional details", () => {
    expect(normalizeVoidReason("duplicate_entry")).toBe("duplicate_entry");
    expect(normalizeVoidReason("Duplicate Entry")).toBe("duplicate_entry");
    expect(normalizeVoidReason("wrong_amount|Charged 5000 instead of 500")).toBe("wrong_amount|Charged 5000 instead of 500");
    expect(normalizeVoidReason("  entered_by_mistake  ")).toBe("entered_by_mistake");
  });

  it("folds legacy free text into other with details preserved", () => {
    expect(normalizeVoidReason("oops wrong customer")).toBe("other|oops wrong customer");
    expect(normalizeVoidReason("")).toBeNull();
    expect(normalizeVoidReason(null)).toBeNull();
  });

  it("labels void reasons for display", () => {
    expect(getVoidReasonLabel("duplicate_entry")).toBe("Duplicate entry");
    expect(getVoidReasonLabel("wrong_amount|Too much")).toBe("Wrong amount — Too much");
    expect(getVoidReasonLabel(null)).toBe("No reason given");
  });
});

describe("paymentSchema", () => {
  const base = { amountInCents: "100.00", paymentDate: "2026-06-02", method: "cash" };

  it("accepts a basic cash payment", () => {
    const parsed = paymentSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it("rejects zero and negative amounts", () => {
    expect(paymentSchema.safeParse({ ...base, amountInCents: "0" }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...base, amountInCents: "-5" }).success).toBe(false);
  });

  it("requires notes when the method is other", () => {
    expect(paymentSchema.safeParse({ ...base, method: "other" }).success).toBe(false);
    const withNotes = paymentSchema.safeParse({ ...base, method: "other", notes: "Local remittance TX-1" });
    expect(withNotes.success).toBe(true);
  });

  it("accepts an optional idempotency key", () => {
    const parsed = paymentSchema.safeParse({ ...base, idempotencyKey: "123e4567-e89b-12d3-a456-426614174000" });
    expect(parsed.success).toBe(true);
  });
});

describe("voidPaymentSchema", () => {
  it("requires a reason", () => {
    expect(voidPaymentSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(voidPaymentSchema.safeParse({ reason: "duplicate_entry" }).success).toBe(true);
  });
});
