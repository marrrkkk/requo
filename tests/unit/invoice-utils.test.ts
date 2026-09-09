import { describe, expect, it } from "vitest";

import { invoiceSchema } from "@/features/invoices/schemas";
import {
  addDays,
  calculateInvoicePaymentState,
  getInvoiceStatusLabel,
  parseMoneyToCents,
} from "@/features/invoices/utils";

describe("features/invoices/utils", () => {
  it("parses money strings into integer cents", () => {
    expect(parseMoneyToCents("0")).toBe(0);
    expect(parseMoneyToCents("12.50")).toBe(1250);
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
    expect(parseMoneyToCents("7")).toBe(700);
  });

  it("rejects invalid money input", () => {
    expect(parseMoneyToCents("abc")).toBeNaN();
    expect(parseMoneyToCents("-5")).toBeNaN();
    expect(parseMoneyToCents("1.234")).toBeNaN();
    expect(parseMoneyToCents("")).toBeNaN();
  });

  it("adds calendar days to date-only strings", () => {
    expect(addDays("2026-01-01", 14)).toBe("2026-01-15");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("keeps draft and void lifecycle states as-is", () => {
    expect(
      calculateInvoicePaymentState({
        totalInCents: 10000,
        paidInCents: 10000,
        dueDate: "2026-01-01",
        lifecycleStatus: "draft",
        today: "2026-06-01",
      }).status,
    ).toBe("draft");
    expect(
      calculateInvoicePaymentState({
        totalInCents: 10000,
        paidInCents: 5000,
        dueDate: "2026-01-01",
        lifecycleStatus: "voided",
        today: "2026-06-01",
      }).status,
    ).toBe("voided");
  });

  it("derives paid, overdue, partial, and unpaid states", () => {
    const base = { totalInCents: 10000, today: "2026-06-01" } as const;
    expect(
      calculateInvoicePaymentState({ ...base, paidInCents: 10000, dueDate: "2026-07-01", lifecycleStatus: "sent" })
        .status,
    ).toBe("paid");
    expect(
      calculateInvoicePaymentState({ ...base, paidInCents: 0, dueDate: "2026-05-01", lifecycleStatus: "sent" }).status,
    ).toBe("overdue");
    expect(
      calculateInvoicePaymentState({ ...base, paidInCents: 4000, dueDate: "2026-07-01", lifecycleStatus: "sent" })
        .status,
    ).toBe("partially_paid");
    expect(
      calculateInvoicePaymentState({ ...base, paidInCents: 0, dueDate: "2026-07-01", lifecycleStatus: "sent" }).status,
    ).toBe("unpaid");
  });

  it("clamps paid amounts to the invoice total", () => {
    const state = calculateInvoicePaymentState({
      totalInCents: 10000,
      paidInCents: 99999,
      dueDate: "2026-07-01",
      lifecycleStatus: "sent",
      today: "2026-06-01",
    });
    expect(state).toEqual({ paidInCents: 10000, balanceInCents: 0, status: "paid" });
  });

  it("labels every invoice status", () => {
    expect(getInvoiceStatusLabel("draft")).toBe("Draft");
    expect(getInvoiceStatusLabel("partially_paid")).toBe("Partially paid");
    expect(getInvoiceStatusLabel("voided")).toBe("Void");
  });
});

describe("features/invoices/schemas", () => {
  const validItem = { description: "Deep clean", quantity: 1, unitPriceInCents: "100.00" };

  function validInvoice(overrides: Record<string, unknown> = {}) {
    return {
      title: "Invoice",
      customerName: "Jane Doe",
      customerEmail: "",
      customerContactMethod: "email",
      customerContactHandle: "",
      issueDate: "2026-06-01",
      dueDate: "2026-06-15",
      discountInCents: "0",
      taxInCents: "0",
      items: [validItem],
      ...overrides,
    };
  }

  it("accepts a valid invoice payload", () => {
    expect(invoiceSchema.safeParse(validInvoice()).success).toBe(true);
  });

  it("rejects due dates before the issue date", () => {
    const result = invoiceSchema.safeParse(validInvoice({ dueDate: "2026-05-01" }));
    expect(result.success).toBe(false);
  });

  it("rejects discounts above the subtotal", () => {
    const result = invoiceSchema.safeParse(validInvoice({ discountInCents: "1000.00" }));
    expect(result.success).toBe(false);
  });

  it("requires at least one line item", () => {
    const result = invoiceSchema.safeParse(validInvoice({ items: [] }));
    expect(result.success).toBe(false);
  });
});
