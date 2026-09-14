import { describe, expect, it } from "vitest";

import { getBillingDriftNote } from "@/features/admin/components/billing/admin-business-billing-section";

describe("getBillingDriftNote", () => {
  it("stays quiet when there is no account subscription", () => {
    expect(getBillingDriftNote("free", null)).toBeNull();
  });

  it("stays quiet when both sources agree", () => {
    expect(getBillingDriftNote("pro", "pro")).toBeNull();
    expect(getBillingDriftNote("free", "free")).toBeNull();
  });

  it("warns with both plans named when the sources disagree", () => {
    const note = getBillingDriftNote("pro", "business");

    expect(note).toContain("business");
    expect(note).toContain("pro");
    // The UI must never claim a single source of truth.
    expect(note).toMatch(/neither/i);
  });
});
