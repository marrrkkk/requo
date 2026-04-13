import type { BusinessType } from "@/features/inquiries/business-types";
import type {
  InquiryFormConfig,
  InquirySubmittedFieldSnapshot,
} from "@/features/inquiries/form-config";
import type { InquiryPageConfig } from "@/features/inquiries/page-config";
import type { WorkspacePlan } from "@/lib/plans/plans";

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
  businessInquiryFormId: string;
  inquiryFormName: string;
  inquiryFormSlug: string;
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
  businessId: string;
  businessInquiryFormId: string;
  inquiryFormName: string;
  inquiryFormSlug: string;
  inquiryFormBusinessType: BusinessType;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  companyName: string | null;
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
  submittedFieldSnapshot: InquirySubmittedFieldSnapshot | null;
};

export type InquiryListFilters = {
  q?: string;
  status: InquiryStatusFilterValue;
  form: string;
  sort: "newest" | "oldest";
  page: number;
};

export type InquiryListQueryFilters = Omit<InquiryListFilters, "page">;

export type BusinessInquiryFormSummary = {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  isDefault: boolean;
  publicInquiryEnabled: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

export type PublicInquiryBusiness = {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  businessType: BusinessType;
  shortDescription: string | null;
  logoUrl: string | null;
  form: {
    id: string;
    name: string;
    slug: string;
    businessType: BusinessType;
    isDefault: boolean;
    publicInquiryEnabled: boolean;
  };
  inquiryFormConfig: InquiryFormConfig;
  inquiryPageConfig: InquiryPageConfig;
};

export type PublicInquiryFieldErrors = Partial<
  Record<string, string[] | undefined>
>;

export type PublicInquiryFormState = {
  error?: string;
  success?: string;
  fieldErrors?: PublicInquiryFieldErrors;
  inquiryId?: string;
};
