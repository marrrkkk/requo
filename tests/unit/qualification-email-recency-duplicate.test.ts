import { describe, expect, it } from "vitest";

import { findEmailRecencyDuplicate } from "@/features/inquiries/qualification/duplicate-detection";
import type { RecentInquiryInput } from "@/features/inquiries/qualification/types";

describe("features/inquiries/qualification/duplicate-detection - findEmailRecencyDuplicate", () => {
  const submittedAt = new Date("2025-01-15T12:00:00.000Z");

  const makeInquiry = (
    id: string,
    email: string,
    daysAgo: number,
  ): RecentInquiryInput => ({
    id,
    details: "Some inquiry details",
    submittedAt: new Date(submittedAt.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    customerEmail: email,
  });

  it("returns null when customerEmail is null", () => {
    const recentInquiries = [makeInquiry("inq-1", "test@example.com", 3)];
    const result = findEmailRecencyDuplicate(null, recentInquiries, submittedAt);
    expect(result).toBeNull();
  });

  it("returns null when recentInquiries is empty", () => {
    const result = findEmailRecencyDuplicate("test@example.com", [], submittedAt);
    expect(result).toBeNull();
  });

  it("returns matching inquiry ID when same email exists within 7 days", () => {
    const recentInquiries = [makeInquiry("inq-1", "test@example.com", 3)];
    const result = findEmailRecencyDuplicate(
      "test@example.com",
      recentInquiries,
      submittedAt,
    );
    expect(result).toBe("inq-1");
  });

  it("returns null when same email exists but outside 7-day window", () => {
    const recentInquiries = [makeInquiry("inq-1", "test@example.com", 8)];
    const result = findEmailRecencyDuplicate(
      "test@example.com",
      recentInquiries,
      submittedAt,
    );
    expect(result).toBeNull();
  });

  it("returns inquiry ID at exactly 7 days boundary (inclusive)", () => {
    const recentInquiries = [makeInquiry("inq-1", "test@example.com", 7)];
    const result = findEmailRecencyDuplicate(
      "test@example.com",
      recentInquiries,
      submittedAt,
    );
    expect(result).toBe("inq-1");
  });

  it("performs case-insensitive email comparison", () => {
    const recentInquiries = [makeInquiry("inq-1", "Test@Example.COM", 3)];
    const result = findEmailRecencyDuplicate(
      "test@example.com",
      recentInquiries,
      submittedAt,
    );
    expect(result).toBe("inq-1");
  });

  it("ignores inquiries from different emails", () => {
    const recentInquiries = [makeInquiry("inq-1", "other@example.com", 3)];
    const result = findEmailRecencyDuplicate(
      "test@example.com",
      recentInquiries,
      submittedAt,
    );
    expect(result).toBeNull();
  });

  it("returns the most recent matching inquiry when multiple exist", () => {
    const recentInquiries = [
      makeInquiry("inq-old", "test@example.com", 6),
      makeInquiry("inq-recent", "test@example.com", 2),
      makeInquiry("inq-mid", "test@example.com", 4),
    ];
    const result = findEmailRecencyDuplicate(
      "test@example.com",
      recentInquiries,
      submittedAt,
    );
    expect(result).toBe("inq-recent");
  });

  it("respects custom windowDays parameter", () => {
    const recentInquiries = [makeInquiry("inq-1", "test@example.com", 10)];

    // Default 7 days — should not match
    const result7 = findEmailRecencyDuplicate(
      "test@example.com",
      recentInquiries,
      submittedAt,
      7,
    );
    expect(result7).toBeNull();

    // Custom 14 days — should match
    const result14 = findEmailRecencyDuplicate(
      "test@example.com",
      recentInquiries,
      submittedAt,
      14,
    );
    expect(result14).toBe("inq-1");
  });

  it("does not match inquiries submitted at the same time as the new inquiry", () => {
    const recentInquiries: RecentInquiryInput[] = [
      {
        id: "inq-same-time",
        details: "Details",
        submittedAt: new Date(submittedAt.getTime()), // exact same time
        customerEmail: "test@example.com",
      },
    ];
    const result = findEmailRecencyDuplicate(
      "test@example.com",
      recentInquiries,
      submittedAt,
    );
    expect(result).toBeNull();
  });
});
