import type { InquiryStatus } from "@/features/inquiries/types";
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
  customerEmail: string;
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
  customerEmail: string;
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
  waitingInquiries: number;
  followUpDueQuotes: number;
  recentAcceptedQuotes: number;
};

export type BusinessOverviewData = {
  overdueInquiries: BusinessOverviewInquiryActionItem[];
  expiringSoonQuotes: BusinessOverviewQuoteActionItem[];
  waitingInquiries: BusinessOverviewInquiryActionItem[];
  followUpDueQuotes: BusinessOverviewQuoteActionItem[];
  recentAcceptedQuotes: BusinessOverviewQuoteActionItem[];
  counts: BusinessOverviewCounts;
};

export type BusinessDashboardSummaryData = {
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
    workspaceId?: string[] | undefined;
  };
};
