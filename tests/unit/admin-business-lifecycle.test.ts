import { describe, expect, it } from "vitest";

import { adminActionLabels } from "@/features/admin/labels";
import {
  adminArchiveBusinessSchema,
  adminCancelBusinessSubscriptionSchema,
  adminDeleteBusinessSchema,
  adminOverrideBusinessPlanSchema,
  adminRestoreBusinessSchema,
} from "@/features/admin/schemas";

const validInput = {
  businessId: "biz_1",
  confirmToken: "valid-confirm-token-123",
};

describe("features/admin business lifecycle schemas", () => {
  it.each([
    ["archive", adminArchiveBusinessSchema],
    ["restore", adminRestoreBusinessSchema],
    ["delete", adminDeleteBusinessSchema],
  ])("accepts a well-formed %s payload", (_name, schema) => {
    expect(schema.safeParse(validInput).success).toBe(true);
  });

  it.each([
    ["archive", adminArchiveBusinessSchema],
    ["restore", adminRestoreBusinessSchema],
    ["delete", adminDeleteBusinessSchema],
  ])("rejects empty ids, short tokens, and unknown keys on %s", (_name, schema) => {
    expect(
      schema.safeParse({ businessId: "", confirmToken: validInput.confirmToken })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ businessId: "biz_1", confirmToken: "short" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...validInput, extra: "nope" }).success,
    ).toBe(false);
  });
});

describe("features/admin business subscription schemas", () => {
  it("accepts a well-formed plan override", () => {
    const result = adminOverrideBusinessPlanSchema.safeParse({
      businessId: "biz_1",
      plan: "pro",
      reason: "Support comp",
      confirmToken: "valid-confirm-token-123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects free plans, bad ids, and short tokens on override", () => {
    expect(
      adminOverrideBusinessPlanSchema.safeParse({
        businessId: "biz_1",
        plan: "free",
        confirmToken: "valid-confirm-token-123",
      }).success,
    ).toBe(false);
    expect(
      adminOverrideBusinessPlanSchema.safeParse({
        businessId: "",
        plan: "pro",
        confirmToken: "valid-confirm-token-123",
      }).success,
    ).toBe(false);
    expect(
      adminOverrideBusinessPlanSchema.safeParse({
        businessId: "biz_1",
        plan: "pro",
        confirmToken: "short",
      }).success,
    ).toBe(false);
  });

  it("accepts a well-formed subscription cancel and rejects bad input", () => {
    expect(
      adminCancelBusinessSubscriptionSchema.safeParse({
        businessId: "biz_1",
        confirmToken: "valid-confirm-token-123",
      }).success,
    ).toBe(true);
    expect(
      adminCancelBusinessSubscriptionSchema.safeParse({
        businessId: "biz_1",
        confirmToken: "short",
      }).success,
    ).toBe(false);
  });
});

describe("features/admin business lifecycle labels", () => {
  it("labels every new lifecycle action for the audit feed", () => {
    expect(adminActionLabels["business.archive"]).toBe("Archived business");
    expect(adminActionLabels["business.restore"]).toBe("Restored business");
    expect(adminActionLabels["business.delete"]).toBe("Deleted business");
  });
});
