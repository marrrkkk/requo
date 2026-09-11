import type { InvoiceDetail } from "@/features/invoices/types";

export type InvoiceDocumentData = {
  businessName: string;
  invoiceNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  paymentTerms: string | null;
  subtotalInCents: number;
  discountInCents: number;
  taxInCents: number;
  taxLabel: string | null;
  totalInCents: number;
  paidInCents: number;
  balanceInCents: number;
  items: InvoiceDetail["items"];
};

export function getInvoiceDocumentData({
  businessName,
  invoice,
}: {
  businessName: string;
  invoice: InvoiceDetail;
}): InvoiceDocumentData {
  return {
    businessName,
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    subtotalInCents: invoice.subtotalInCents,
    discountInCents: invoice.discountInCents,
    taxInCents: invoice.taxInCents,
    taxLabel: invoice.taxLabel,
    totalInCents: invoice.totalInCents,
    paidInCents: invoice.paidInCents,
    balanceInCents: invoice.balanceInCents,
    items: invoice.items,
  };
}
