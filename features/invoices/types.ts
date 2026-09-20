import type { InvoiceStatus, PaymentMethod } from "@/lib/db/schema/invoices";

export type { InvoiceStatus, PaymentMethod };

export const invoiceStatuses = [
  "draft",
  "sent",
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
  "voided",
] as const;

export const paymentMethods = ["cash", "bank_transfer", "gcash", "maya", "check", "other"] as const;

export const voidReasonValues = [
  "duplicate_entry",
  "wrong_amount",
  "wrong_invoice",
  "not_received",
  "entered_by_mistake",
  "other",
] as const;

export const invoiceStatusFilterValues = ["all", ...invoiceStatuses] as const;

export type InvoiceStatusFilterValue = (typeof invoiceStatusFilterValues)[number];

export type InvoiceSortValue = "newest" | "oldest";

export type InvoiceListFilters = {
  q?: string;
  status: InvoiceStatusFilterValue;
  sort: InvoiceSortValue;
  page: number;
};

export type InvoiceLineItemView = {
  id: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
  position: number;
};

export type PaymentView = {
  id: string;
  paymentNumber: string;
  amountInCents: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: Date;
  voidedAt: Date | null;
  voidReason: string | null;
  source: string;
};

export type OptimisticPayment = PaymentView & { pending?: boolean; optimisticKey?: string };

export type PaymentDetailView = PaymentView & {
  invoiceId: string;
  invoiceNumber: string;
  invoiceTitle: string;
  customerName: string;
  customerEmail: string | null;
  currency: string;
  invoiceTotalInCents: number;
  invoicePaidInCents: number;
  invoiceBalanceInCents: number;
  invoiceStatus: InvoiceStatus;
  recordedByName: string | null;
};

export const paymentStatusFilterValues = ["all", "recorded", "voided"] as const;

export type PaymentStatusFilterValue = (typeof paymentStatusFilterValues)[number];

export type PaymentListFilters = {
  q?: string;
  status: PaymentStatusFilterValue;
  method: "all" | PaymentMethod;
  from?: string;
  to?: string;
  invoiceId?: string;
  page: number;
};

export type PaymentListItem = {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  currency: string;
  amountInCents: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  status: "recorded" | "voided";
  recordedByName: string | null;
  createdAt: Date;
};

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  currency: string;
  issueDate: string;
  dueDate: string;
  totalInCents: number;
  paidInCents: number;
  balanceInCents: number;
  status: InvoiceStatus;
};

export type InvoiceDetail = InvoiceListItem & {
  quoteId: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  notes: string | null;
  paymentTerms: string | null;
  subtotalInCents: number;
  discountInCents: number;
  taxInCents: number;
  taxLabel: string | null;
  sentAt: Date | null;
  voidedAt: Date | null;
  items: InvoiceLineItemView[];
  payments: PaymentView[];
};

/**
 * Cheap core of the invoice detail: the invoice row with paid/balance
 * totals derived from a scalar payments sum. Paints the page header and
 * the status/amounts section while line items and recorded payments
 * stream separately.
 */
export type InvoiceDetailCore = Omit<InvoiceDetail, "items" | "payments">;

export type InvoiceActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  invoiceId?: string;
  invoiceNumber?: string;
};

export type InvoiceDeliveryMethod = "requo" | "manual";

export type PaymentActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
