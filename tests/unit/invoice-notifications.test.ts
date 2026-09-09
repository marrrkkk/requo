import { describe, expect, it } from "vitest";

import { getInvoicePdfFileName, getInvoicePngFileName } from "@/features/invoices/pdf";
import { getInvoiceDocumentData } from "@/features/invoices/documents";
import type { InvoiceDetail } from "@/features/invoices/types";
import {
  buildBusinessNotificationHref,
  getBusinessNotificationTypeLabel,
} from "@/features/notifications/utils";

const baseInvoice: InvoiceDetail = {
  id: "inv_1",
  invoiceNumber: "INV-000001",
  title: "Storefront signage",
  customerName: "Ava Cruz",
  customerEmail: "ava@example.com",
  customerContactMethod: "email",
  customerContactHandle: "ava@example.com",
  currency: "USD",
  issueDate: "2026-06-01",
  dueDate: "2026-06-15",
  totalInCents: 230000,
  paidInCents: 0,
  balanceInCents: 230000,
  status: "sent",
  quoteId: null,
  notes: null,
  paymentTerms: null,
  subtotalInCents: 230000,
  discountInCents: 0,
  taxInCents: 0,
  taxLabel: null,
  sentAt: null,
  voidedAt: null,
  items: [
    {
      id: "ilit_1",
      description: "Signage design and installation",
      quantity: 1,
      unitPriceInCents: 230000,
      lineTotalInCents: 230000,
      position: 0,
    },
  ],
  payments: [],
};

describe("invoice documents", () => {
  it("builds document data and file names from an invoice", () => {
    const data = getInvoiceDocumentData({ businessName: "BrightSide", invoice: { ...baseInvoice } });

    expect(data.invoiceNumber).toBe("INV-000001");
    expect(data.balanceInCents).toBe(230000);
    expect(getInvoicePdfFileName(data)).toBe("inv-000001.pdf");
    expect(getInvoicePngFileName(data)).toBe("inv-000001.png");
  });
});

describe("invoice notifications", () => {
  it("links invoice notifications to the invoice detail page", () => {
    expect(
      buildBusinessNotificationHref("acme", { inquiryId: null, quoteId: null, invoiceId: "inv_1" }),
    ).toBe("/acme/invoices/inv_1");
  });

  it("prefers the invoice link when both invoice and quote are present", () => {
    expect(
      buildBusinessNotificationHref("acme", { inquiryId: null, quoteId: "qt_1", invoiceId: "inv_1" }),
    ).toBe("/acme/invoices/inv_1");
  });

  it("labels invoice notification types", () => {
    expect(getBusinessNotificationTypeLabel("invoice_paid")).toBe("Invoice paid");
    expect(getBusinessNotificationTypeLabel("invoice_overdue")).toBe("Invoice overdue");
  });
});
