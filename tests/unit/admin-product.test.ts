import { describe, expect, it } from "vitest";

import {
  formatAdminMoney,
  formatContactHandle,
  formatFileSize,
  getQuoteDeliverySummary,
} from "@/features/admin/components/product/admin-product-format";
import {
  adminInquiriesListFiltersSchema,
  adminQuotesListFiltersSchema,
} from "@/features/admin/schemas";

describe("getQuoteDeliverySummary", () => {
  it("reports unsent quotes", () => {
    expect(getQuoteDeliverySummary(null, [])).toContain("Not sent");
  });

  it("confirms delivery when a sent email is on record", () => {
    expect(
      getQuoteDeliverySummary(new Date("2026-09-01T00:00:00Z"), [
        { status: "failed" },
        { status: "sent" },
      ]),
    ).toContain("delivery confirmed");
  });

  it("flags recorded emails with none confirmed sent", () => {
    expect(
      getQuoteDeliverySummary(new Date("2026-09-01T00:00:00Z"), [
        { status: "failed" },
      ]),
    ).toContain("none confirmed sent");
  });

  it("names manual sharing when sent with no delivery email", () => {
    expect(
      getQuoteDeliverySummary(new Date("2026-09-01T00:00:00Z"), []),
    ).toContain("manually");
  });
});

describe("formatAdminMoney", () => {
  it("formats USD and PHP through the billing formatter", () => {
    expect(formatAdminMoney(2900, "USD")).toBe("$29.00");
    expect(formatAdminMoney(0, "USD")).toBe("$0.00");
    expect(formatAdminMoney(129900, "PHP")).toBe("₱1,299");
  });

  it("falls back to a code suffix for other currencies", () => {
    expect(formatAdminMoney(1000, "EUR")).toBe("10.00 EUR");
  });

  it("defaults a missing currency to USD", () => {
    expect(formatAdminMoney(500, null)).toBe("$5.00");
  });
});

describe("formatFileSize", () => {
  it("formats bytes through gigabytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("guards non-finite and negative input", () => {
    expect(formatFileSize(Number.NaN)).toBe("—");
    expect(formatFileSize(-1)).toBe("—");
  });
});

describe("formatContactHandle", () => {
  it("combines method and handle, tolerating blanks", () => {
    expect(formatContactHandle("email", "a@example.com")).toBe(
      "email: a@example.com",
    );
    expect(formatContactHandle("", "a@example.com")).toBe("a@example.com");
    expect(formatContactHandle("phone", "")).toBe("phone");
  });
});

describe("admin product list filter schemas", () => {
  it("parses inquiry filters with the q alias and a status", () => {
    expect(
      adminInquiriesListFiltersSchema.parse({ q: "acme", status: "new" }),
    ).toMatchObject({ search: "acme", status: "new", page: 1 });
  });

  it("drops unknown inquiry statuses instead of rejecting", () => {
    expect(
      adminInquiriesListFiltersSchema.parse({ status: "bogus" }),
    ).toMatchObject({ page: 1 });
  });

  it("parses quote filters with the q alias and a status", () => {
    expect(
      adminQuotesListFiltersSchema.parse({ q: "Q-100", status: "sent" }),
    ).toMatchObject({ search: "Q-100", status: "sent", page: 1 });
  });

  it("drops unknown quote statuses instead of rejecting", () => {
    expect(adminQuotesListFiltersSchema.parse({ status: "bogus" })).toMatchObject(
      { page: 1 },
    );
  });
});
