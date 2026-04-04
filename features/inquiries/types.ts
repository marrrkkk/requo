import type { InquiryPageConfig } from "@/features/inquiries/page-config";

export const inquiryStatuses = [
  "new",
  "quoted",
  "waiting",
  "won",
  "lost",
  "archived",
] as const;

export type InquiryStatus = (typeof inquiryStatuses)[number];
export const inquiryStatusFilterValues = ["all", ...inquiryStatuses] as const;
export type InquiryStatusFilterValue = (typeof inquiryStatusFilterValues)[number];

export type DashboardInquiryListItem = {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceCategory: string;
  budgetText: string | null;
  status: InquiryStatus;
  subject: string | null;
  submittedAt: Date;
  createdAt: Date;
};

export type DashboardInquiryAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: Date;
};

export type DashboardInquiryNote = {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
  authorEmail: string | null;
};

export type DashboardInquiryActivity = {
  id: string;
  type: string;
  summary: string;
  createdAt: Date;
  actorName: string | null;
};

export type DashboardInquiryRelatedQuote = {
  id: string;
  status: string;
  quoteNumber: string | null;
  totalInCents: number;
  createdAt: Date;
  quoteCount: number;
};

export type DashboardInquiryDetail = {
  id: string;
  workspaceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  serviceCategory: string;
  requestedDeadline: string | null;
  budgetText: string | null;
  subject: string | null;
  details: string;
  source: string | null;
  status: InquiryStatus;
  submittedAt: Date;
  createdAt: Date;
  attachments: DashboardInquiryAttachment[];
  notes: DashboardInquiryNote[];
  activities: DashboardInquiryActivity[];
  relatedQuote: DashboardInquiryRelatedQuote | null;
};

export type InquiryListFilters = {
  q?: string;
  status: InquiryStatusFilterValue;
};

export type InquiryNoteFieldErrors = Partial<Record<"body", string[] | undefined>>;
export type InquiryStatusFieldErrors = Partial<
  Record<"status", string[] | undefined>
>;

export type InquiryNoteActionState = {
  error?: string;
  success?: string;
  fieldErrors?: InquiryNoteFieldErrors;
};

export type InquiryStatusActionState = {
  error?: string;
  success?: string;
  fieldErrors?: InquiryStatusFieldErrors;
};

export type PublicInquiryWorkspace = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  logoUrl: string | null;
  inquiryPageConfig: InquiryPageConfig;
};

export type PublicInquiryFieldName =
  | "customerName"
  | "customerEmail"
  | "customerPhone"
  | "serviceCategory"
  | "deadline"
  | "budget"
  | "details"
  | "attachment";

export type PublicInquiryFieldErrors = Partial<
  Record<PublicInquiryFieldName, string[] | undefined>
>;

export type PublicInquiryFormState = {
  error?: string;
  success?: string;
  fieldErrors?: PublicInquiryFieldErrors;
  inquiryId?: string;
};
