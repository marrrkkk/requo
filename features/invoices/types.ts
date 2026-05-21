export const invoiceStatuses = [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "voided",
] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const invoiceStatusFilterValues = ["all", ...invoiceStatuses] as const;
export type InvoiceStatusFilterValue =
  (typeof invoiceStatusFilterValues)[number];

export const invoiceRecordViews = ["active", "archived"] as const;
export type InvoiceRecordView = (typeof invoiceRecordViews)[number];

export type InvoiceListFilters = {
  q?: string;
  view: InvoiceRecordView;
  status: InvoiceStatusFilterValue;
  sort: "newest" | "oldest";
  page: number;
};

export type DashboardInvoiceListItem = {
  id: string;
  invoiceNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  status: InvoiceStatus;
  currency: string;
  totalInCents: number;
  issuedAt: Date | null;
  dueAt: Date | null;
  sentAt: Date | null;
  paidAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
};

export type DashboardInvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
  position: number;
};

export type DashboardInvoiceDetail = {
  id: string;
  businessId: string;
  jobId: string | null;
  quoteId: string | null;
  invoiceNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  status: InvoiceStatus;
  currency: string;
  notes: string | null;
  terms: string | null;
  subtotalInCents: number;
  discountInCents: number;
  taxInCents: number;
  taxLabel: string | null;
  totalInCents: number;
  issuedAt: Date | null;
  dueAt: Date | null;
  sentAt: Date | null;
  viewedAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: DashboardInvoiceItem[];
  linkedQuoteNumber: string | null;
  linkedJobTitle: string | null;
  businessName: string;
  businessSlug: string;
  businessLogoStoragePath: string | null;
  businessContactEmail: string | null;
};

export type InvoiceEditorActionState = {
  error?: string;
  success?: string;
  invoiceId?: string;
  fieldErrors?: Partial<
    Record<
      | "title"
      | "customerName"
      | "customerEmail"
      | "notes"
      | "terms"
      | "dueAt"
      | "items",
      string[] | undefined
    >
  >;
};

export type InvoiceRecordActionState = {
  error?: string;
  success?: string;
};
