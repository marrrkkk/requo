import type { BusinessRecordState } from "@/features/businesses/lifecycle";
import type { InquiryStatus } from "@/features/inquiries/types";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import type {
  QuotePostAcceptanceStatus,
  QuoteReminderKind,
  QuoteStatus,
} from "@/features/quotes/types";
export {
  businessMemberRoles,
  type BusinessMemberRole,
} from "@/lib/business-members";

export type BusinessOverviewInquiryActionItem = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  serviceCategory: string;
  status: InquiryStatus;
  submittedAt: Date;
};

export type BusinessOverviewQuoteActionItem = {
  id: string;
  inquiryId: string | null;
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  currency: string;
  totalInCents: number;
  status: QuoteStatus;
  postAcceptanceStatus: QuotePostAcceptanceStatus;
  validUntil: string;
  sentAt: Date | null;
  acceptedAt: Date | null;
  customerRespondedAt: Date | null;
  updatedAt: Date;
  reminders: QuoteReminderKind[];
};

export type BusinessOverviewCounts = {
  overdueInquiries: number;
  expiringSoonQuotes: number;
  newInquiries: number;
  recentAcceptedQuotes: number;
  draftQuotes: number;
};

export type BusinessOverviewData = {
  overdueInquiries: BusinessOverviewInquiryActionItem[];
  expiringSoonQuotes: BusinessOverviewQuoteActionItem[];
  newInquiries: BusinessOverviewInquiryActionItem[];
  recentAcceptedQuotes: BusinessOverviewQuoteActionItem[];
  draftQuotes: BusinessOverviewQuoteActionItem[];
  counts: BusinessOverviewCounts;
};

export type BusinessDashboardSummaryData = {
  totalInquiries: number;
  totalQuotes: number;
  inquiriesThisWeek: number;
  inquiryCoverageRate: number;
  wonCount: number;
  lostCount: number;
};

export type CreateBusinessActionState = {
  error?: string;
  fieldErrors?: {
    name?: string[] | undefined;
    businessType?: string[] | undefined;
    defaultCurrency?: string[] | undefined;
    businessId?: string[] | undefined;
  };
};

export type BusinessQuotaSnapshot = {
  ownerUserId: string;
  plan: plan;
  current: number;
  limit: number | null;
  allowed: boolean;
  upgradePlan: plan | null;
};

export type BusinessRecordActionState = {
  error?: string;
  success?: string;
  fieldErrors?: {
    confirmation?: string[] | undefined;
  };
};

export type BusinessLifecycleView = {
  id: string;
  name: string;
  slug: string;
  businessId: string;
  businessSlug: string;
  recordState: BusinessRecordState;
  archivedAt: Date | null;
  deletedAt: Date | null;
  activeBusinessCount: number;
};
