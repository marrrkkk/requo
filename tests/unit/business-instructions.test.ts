import { describe, expect, it } from "vitest";

import {
  businessInstructionsMaxLength,
  normalizeBusinessInstructions,
} from "@/lib/ai/business-instructions";

describe("normalizeBusinessInstructions", () => {
  it("trims the stored value and preserves line breaks", () => {
    expect(
      normalizeBusinessInstructions("  We quote by square footage.\nMinimum $120.  "),
    ).toBe("We quote by square footage.\nMinimum $120.");
  });

  it("returns null for values that carry no guidance", () => {
    expect(normalizeBusinessInstructions("   ")).toBeNull();
    expect(normalizeBusinessInstructions("")).toBeNull();
    expect(normalizeBusinessInstructions(null)).toBeNull();
    expect(normalizeBusinessInstructions(undefined)).toBeNull();
    expect(normalizeBusinessInstructions(42)).toBeNull();
  });

  it("caps the value so a long entry cannot blow a surface's token budget", () => {
    const normalized = normalizeBusinessInstructions(
      "a".repeat(businessInstructionsMaxLength + 500),
    );

    expect(normalized).toHaveLength(businessInstructionsMaxLength);
    expect(businessInstructionsMaxLength).toBe(1000);
  });
});
