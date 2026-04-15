export const quoteStatuses = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
] as const;

export type QuoteStatus = (typeof quoteStatuses)[number];
export const quoteStatusFilterValues = ["all", ...quoteStatuses] as const;
export type QuoteStatusFilterValue = (typeof quoteStatusFilterValues)[number];
export const quotePostAcceptanceStatuses = [
  "none",
  "booked",
  "scheduled",
] as const;
export type QuotePostAcceptanceStatus =
  (typeof quotePostAcceptanceStatuses)[number];
export const quoteReminderKinds = ["follow_up_due", "expiring_soon"] as const;
export type QuoteReminderKind = (typeof quoteReminderKinds)[number];
export const quoteLibraryEntryKinds = ["block", "package"] as const;
export type QuoteLibraryEntryKind = (typeof quoteLibraryEntryKinds)[number];

import type { BusinessPlan } from "@/lib/plans/plans";

export type QuoteListFilters = {
  q?: string;
  status: QuoteStatusFilterValue;
  sort: "newest" | "oldest";
  page: number;
};

export type QuoteListQueryFilters = Omit<QuoteListFilters, "page">;

export type DashboardQuoteListItem = {
  id: string;
  inquiryId: string | null;
  quoteNumber: string;
  publicToken: string;
  title: string;
  customerName: string;
  customerEmail: string;
  totalInCents: number;
  currency: string;
  validUntil: string;
  status: QuoteStatus;
  postAcceptanceStatus: QuotePostAcceptanceStatus;
  createdAt: Date;
  sentAt: Date | null;
  customerRespondedAt: Date | null;
  reminders: QuoteReminderKind[];
};

export type DashboardQuoteItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
  position: number;
};

export type DashboardQuoteLibraryItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  position: number;
};

export type DashboardQuoteLibraryEntry = {
  id: string;
  currency: string;
  kind: QuoteLibraryEntryKind;
  name: string;
  description: string | null;
  itemCount: number;
  totalInCents: number;
  createdAt: Date;
  updatedAt: Date;
  items: DashboardQuoteLibraryItem[];
};

export type DashboardQuoteLibrarySummary = {
  entryCount: number;
  blockCount: number;
  packageCount: number;
};

export type DashboardQuoteActivity = {
  id: string;
  type: string;
  summary: string;
  createdAt: Date;
  actorName: string | null;
};

export type QuoteLinkedInquirySummary = {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceCategory: string;
  status: string;
};

export type QuoteInquiryPrefill = {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceCategory: string;
  status: string;
  details: string;
  requestedDeadline: string | null;
  budgetText: string | null;
};

export type DashboardQuoteDetail = {
  id: string;
  businessId: string;
  inquiryId: string | null;
  quoteNumber: string;
  publicToken: string;
  title: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  notes: string | null;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  validUntil: string;
  status: QuoteStatus;
  postAcceptanceStatus: QuotePostAcceptanceStatus;
  sentAt: Date | null;
  acceptedAt: Date | null;
  publicViewedAt: Date | null;
  customerRespondedAt: Date | null;
  customerResponseMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: DashboardQuoteItem[];
  activities: DashboardQuoteActivity[];
  linkedInquiry: QuoteLinkedInquirySummary | null;
  reminders: QuoteReminderKind[];
};

export type QuoteSendPayload = {
  id: string;
  inquiryId: string | null;
  quoteNumber: string;
  publicToken: string;
  title: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  notes: string | null;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  validUntil: string;
  status: QuoteStatus;
  updatedAt: Date;
  items: DashboardQuoteItem[];
};

export type PublicQuoteView = {
  id: string;
  token: string;
  quoteNumber: string;
  title: string;
  businessName: string;
  businessPlan: BusinessPlan;
  businessShortDescription: string | null;
  businessContactEmail: string | null;
  customerName: string;
  customerEmail: string;
  currency: string;
  notes: string | null;
  validUntil: string;
  status: QuoteStatus;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  sentAt: Date | null;
  acceptedAt: Date | null;
  publicViewedAt: Date | null;
  customerRespondedAt: Date | null;
  customerResponseMessage: string | null;
  items: DashboardQuoteItem[];
};

export type QuoteEditorLineItemValue = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

export type QuoteEditorValues = {
  title: string;
  customerName: string;
  customerEmail: string;
  notes: string;
  validUntil: string;
  discount: string;
  items: QuoteEditorLineItemValue[];
};

export type QuoteEditorFieldName =
  | "title"
  | "customerName"
  | "customerEmail"
  | "notes"
  | "validUntil"
  | "discount"
  | "items";

export type QuoteEditorFieldErrors = Partial<
  Record<QuoteEditorFieldName, string[] | undefined>
>;

export type QuoteEditorActionState = {
  error?: string;
  success?: string;
  fieldErrors?: QuoteEditorFieldErrors;
};

export type QuoteLibraryEditorValues = {
  kind: QuoteLibraryEntryKind;
  name: string;
  description: string;
  items: QuoteEditorLineItemValue[];
};

export type QuoteLibraryFieldName = "kind" | "name" | "description" | "items";

export type QuoteLibraryFieldErrors = Partial<
  Record<QuoteLibraryFieldName, string[] | undefined>
>;

export type QuoteLibraryActionState = {
  error?: string;
  success?: string;
  fieldErrors?: QuoteLibraryFieldErrors;
};

export type QuoteLibraryDeleteActionState = {
  error?: string;
  success?: boolean;
};

export type QuoteStatusActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<"status", string[] | undefined>>;
};

export type QuotePostAcceptanceActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<
    Record<"postAcceptanceStatus", string[] | undefined>
  >;
};

export type QuoteSendActionState = {
  error?: string;
  success?: string;
};

export type PublicQuoteResponseFieldErrors = Partial<
  Record<"response" | "message", string[] | undefined>
>;

export type PublicQuoteResponseActionState = {
  error?: string;
  success?: string;
  fieldErrors?: PublicQuoteResponseFieldErrors;
};
