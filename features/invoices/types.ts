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

export type InvoiceListFilters = {
  q?: string;
  status: "all" | InvoiceStatus;
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
  amountInCents: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: Date;
  voidedAt: Date | null;
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
