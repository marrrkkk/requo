import type { InquiryStatus } from "@/features/inquiries/types";

export type WorkspaceAnalyticsStatusCount = {
  status: InquiryStatus;
  count: number;
};

export type WorkspaceAnalyticsTrendPoint = {
  label: string;
  weekStart: string;
  inquiries: number;
  won: number;
  lost: number;
  acceptedQuotes: number;
};

export type WorkspaceAnalyticsData = {
  totalInquiries: number;
  inquiriesThisWeek: number;
  wonCount: number;
  lostCount: number;
  inquiryStatusCounts: WorkspaceAnalyticsStatusCount[];
  quoteSummary: {
    totalQuotes: number;
    sentQuotes: number;
    acceptedQuotes: number;
    rejectedQuotes: number;
    expiredQuotes: number;
    linkedInquiryCount: number;
    acceptanceRate: number;
    inquiryCoverageRate: number;
  };
  recentTrend: WorkspaceAnalyticsTrendPoint[];
};
