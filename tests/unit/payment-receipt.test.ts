import { describe, expect, it } from "vitest";

import { createPaymentReceiptPdf, getPaymentReceiptData, getPaymentReceiptFileName } from "@/features/invoices/receipt";
import type { PaymentDetailView } from "@/features/invoices/types";

function detail(): PaymentDetailView {
  return {
    id: "pay_1",
    paymentNumber: "PAY-2026-0001",
    invoiceId: "inv_1",
    invoiceNumber: "INV-000001",
    invoiceTitle: "Service invoice",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    currency: "USD",
    invoiceTotalInCents: 50000,
    invoicePaidInCents: 20000,
    invoiceBalanceInCents: 30000,
    invoiceStatus: "partially_paid",
    amountInCents: 20000,
    paymentDate: "2026-06-02",
    method: "bank_transfer",
    reference: "BDO-829183",
    notes: "50% initial deposit",
    source: "manual",
    recordedByName: "Mark",
    createdByName: "Mark",
    createdAt: new Date("2026-06-02T10:42:00Z"),
    voidedAt: null,
    voidReason: null,
  };
}

describe("payment receipts", () => {
  it("builds receipt data with the correct invoice balance", () => {
    const receipt = getPaymentReceiptData({ businessName: "Acme", payment: detail(), methodLabel: "Bank Transfer" });
    expect(receipt).toEqual(
      expect.objectContaining({
        paymentNumber: "PAY-2026-0001",
        invoiceBalanceInCents: 30000,
        status: "recorded",
      }),
    );
    expect(getPaymentReceiptFileName(receipt)).toBe("pay-2026-0001.pdf");
  });

  it("generates a PDF that starts with the PDF header", async () => {
    const receipt = getPaymentReceiptData({ businessName: "Acme", payment: detail(), methodLabel: "Bank Transfer" });
    const bytes = await createPaymentReceiptPdf(receipt);
    const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("marks voided payments on the receipt", () => {
    const receipt = getPaymentReceiptData({
      businessName: "Acme",
      payment: { ...detail(), voidedAt: new Date("2026-06-03T11:30:00Z"), voidReason: "duplicate_entry" },
      methodLabel: "Bank Transfer",
    });
    expect(receipt.status).toBe("voided");
    expect(receipt.voidReasonLabel).toBe("Duplicate entry");
  });
});
