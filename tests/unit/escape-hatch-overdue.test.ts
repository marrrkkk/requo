import { describe, expect, it } from "vitest";
import {
  isEscapeHatchOverdue,
  type EscapeHatchEntry,
} from "@/lib/instant-navigation/escape-hatches";

describe("isEscapeHatchOverdue", () => {
  const baseEntry: EscapeHatchEntry = {
    route: "app/(business)/[businessSlug]/(main)/home/page.tsx",
    reason: "Complex dynamic widget cannot be made instant yet",
    targetReviewDate: "2025-03-15",
    active: true,
  };

  it("returns true when now is strictly after targetReviewDate", () => {
    // 2025-03-15T00:00:01Z is after 2025-03-15T00:00:00Z (the parsed date)
    const now = new Date("2025-03-16T00:00:00Z");
    expect(isEscapeHatchOverdue(baseEntry, now)).toBe(true);
  });

  it("returns false when now equals targetReviewDate exactly (UTC midnight)", () => {
    const now = new Date("2025-03-15T00:00:00Z");
    expect(isEscapeHatchOverdue(baseEntry, now)).toBe(false);
  });

  it("returns false when now is before targetReviewDate", () => {
    const now = new Date("2025-03-14T23:59:59Z");
    expect(isEscapeHatchOverdue(baseEntry, now)).toBe(false);
  });

  it("returns false when entry is inactive regardless of date", () => {
    const inactiveEntry: EscapeHatchEntry = { ...baseEntry, active: false };
    // Even though now is well past the target date
    const now = new Date("2026-01-01T00:00:00Z");
    expect(isEscapeHatchOverdue(inactiveEntry, now)).toBe(false);
  });

  it("returns false for inactive entry even when now is after targetReviewDate", () => {
    const inactiveEntry: EscapeHatchEntry = {
      ...baseEntry,
      active: false,
      targetReviewDate: "2020-01-01",
    };
    const now = new Date("2025-06-01T12:00:00Z");
    expect(isEscapeHatchOverdue(inactiveEntry, now)).toBe(false);
  });

  it("returns true when now is 1ms after targetReviewDate", () => {
    const now = new Date("2025-03-15T00:00:00.001Z");
    expect(isEscapeHatchOverdue(baseEntry, now)).toBe(true);
  });
});
