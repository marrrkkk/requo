import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AdminInvoiceDetail } from "@/features/admin/components/product/invoices/admin-invoice-detail";
import type { AdminInvoiceDetail as AdminInvoiceDetailPayload } from "@/features/admin/types";

function makeInvoiceDetail(
  overrides: Partial<AdminInvoiceDetailPayload> = {},
): AdminInvoiceDetailPayload {
  return {
    id: "inv_1",
    businessId: "biz_1",
    invoiceNumber: "INV-1001",
    title: "Faucet repair",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerContactMethod: "email",
    customerContactHandle: "jane@example.com",
    status: "partially_paid",
    currency: "USD",
    notes: "Payable within 14 days.",
    paymentTerms: "Net 14",
    subtotalInCents: 25000,
    discountInCents: 0,
    taxInCents: 0,
    totalInCents: 25000,
    paidInCents: 10000,
    balanceInCents: 15000,
    issueDate: "2026-09-01",
    dueDate: "2026-09-15",
    sentAt: new Date("2026-09-02T09:00:00Z"),
    voidedAt: null,
    voidReason: null,
    deletedAt: null,
    createdAt: new Date("2026-09-01T09:00:00Z"),
    updatedAt: new Date("2026-09-02T09:00:00Z"),
    business: { id: "biz_1", name: "Acme Plumbing", slug: "acme", plan: "pro" },
    owner: { userId: "user_1", name: "Owen Owner", email: "owen@example.com" },
    linkedQuote: { id: "quote_1", quoteNumber: "Q-1001", status: "sent" },
    items: [
      {
        id: "item_1",
        description: "Faucet cartridge replacement",
        quantity: 1,
        unitPriceInCents: 25000,
        lineTotalInCents: 25000,
        position: 0,
      },
    ],
    payments: [
      {
        id: "pay_1",
        amountInCents: 10000,
        paymentDate: "2026-09-05",
        method: "bank_transfer",
        reference: "TRX-555",
        notes: null,
        createdByName: "Owen Owner",
        voidedAt: null,
        voidReason: null,
        createdAt: new Date("2026-09-05T10:00:00Z"),
      },
    ],
    ...overrides,
  };
}

describe("AdminInvoiceDetail", () => {
  it("renders payment state, amounts, items, and payments", () => {
    render(<AdminInvoiceDetail detail={makeInvoiceDetail()} />);

    expect(screen.getByText("INV-1001")).toBeInTheDocument();
    expect(screen.getAllByText("$250.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$100.00").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Faucet cartridge replacement"),
    ).toBeInTheDocument();
    expect(screen.getByText("TRX-555")).toBeInTheDocument();
    expect(screen.getByText("Bank transfer")).toBeInTheDocument();
  });

  it("links the source quote and the business", () => {
    render(<AdminInvoiceDetail detail={makeInvoiceDetail()} />);

    expect(
      screen.getByRole("link", { name: "Open Q-1001" }),
    ).toHaveAttribute("href", "/admin/quotes/quote_1");
    expect(
      screen.getByRole("link", { name: "Open business" }),
    ).toHaveAttribute("href", "/admin/businesses/biz_1");
    expect(screen.getByText("owen@example.com")).toBeInTheDocument();
  });

  it("names a manually created invoice with no payments", () => {
    render(
      <AdminInvoiceDetail
        detail={makeInvoiceDetail({
          linkedQuote: null,
          payments: [],
          paidInCents: 0,
          balanceInCents: 25000,
          status: "unpaid",
        })}
      />,
    );

    expect(
      screen.getByText("No linked quote — this invoice was created manually."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No payments recorded for this invoice."),
    ).toBeInTheDocument();
  });

  it("marks voided invoices and voided payments", () => {
    render(
      <AdminInvoiceDetail
        detail={makeInvoiceDetail({
          status: "voided",
          voidedAt: new Date("2026-09-06T09:00:00Z"),
          voidReason: "Duplicate invoice",
          payments: [
            {
              id: "pay_2",
              amountInCents: 5000,
              paymentDate: "2026-09-05",
              method: "cash",
              reference: null,
              notes: null,
              createdByName: null,
              voidedAt: new Date("2026-09-06T09:00:00Z"),
              voidReason: "Entered twice",
              createdAt: new Date("2026-09-05T10:00:00Z"),
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/Voided — no payment due/)).toBeInTheDocument();
    expect(screen.getByText("Voided")).toBeInTheDocument();
  });
});
