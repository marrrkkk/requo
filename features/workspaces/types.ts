import type { InquiryStatus } from "@/features/inquiries/types";
import type {
  QuotePostAcceptanceStatus,
  QuoteReminderKind,
  QuoteStatus,
} from "@/features/quotes/types";

export const workspaceMemberRoles = ["owner", "member"] as const;

export type WorkspaceMemberRole = (typeof workspaceMemberRoles)[number];

export type WorkspaceOverviewInquiryActionItem = {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceCategory: string;
  status: InquiryStatus;
  submittedAt: Date;
};

export type WorkspaceOverviewQuoteActionItem = {
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

export type WorkspaceOverviewCounts = {
  overdueReplies: number;
  expiringSoonQuotes: number;
  inquiriesWithoutQuotes: number;
  followUpDueQuotes: number;
  recentAcceptedQuotes: number;
};

export type WorkspaceOverviewData = {
  overdueReplies: WorkspaceOverviewInquiryActionItem[];
  expiringSoonQuotes: WorkspaceOverviewQuoteActionItem[];
  inquiriesWithoutQuotes: WorkspaceOverviewInquiryActionItem[];
  followUpDueQuotes: WorkspaceOverviewQuoteActionItem[];
  recentAcceptedQuotes: WorkspaceOverviewQuoteActionItem[];
  counts: WorkspaceOverviewCounts;
};

export type CreateWorkspaceActionState = {
  error?: string;
  fieldErrors?: {
    name?: string[] | undefined;
    businessType?: string[] | undefined;
  };
};
