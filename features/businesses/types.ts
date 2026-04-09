import type { InquiryStatus } from "@/features/inquiries/types";
import type {
  QuotePostAcceptanceStatus,
  QuoteReminderKind,
  QuoteStatus,
} from "@/features/quotes/types";

export const businessMemberRoles = ["owner", "member"] as const;

export type BusinessMemberRole = (typeof businessMemberRoles)[number];

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
  overdueReplies: number;
  expiringSoonQuotes: number;
  inquiriesWithoutQuotes: number;
  followUpDueQuotes: number;
  recentAcceptedQuotes: number;
};

export type BusinessOverviewData = {
  overdueReplies: BusinessOverviewInquiryActionItem[];
  expiringSoonQuotes: BusinessOverviewQuoteActionItem[];
  inquiriesWithoutQuotes: BusinessOverviewInquiryActionItem[];
  followUpDueQuotes: BusinessOverviewQuoteActionItem[];
  recentAcceptedQuotes: BusinessOverviewQuoteActionItem[];
  counts: BusinessOverviewCounts;
};

export type CreateBusinessActionState = {
  error?: string;
  fieldErrors?: {
    name?: string[] | undefined;
    businessType?: string[] | undefined;
    countryCode?: string[] | undefined;
  };
};
