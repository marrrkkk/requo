import type { InquiryStatus } from "@/features/inquiries/types";

export type BusinessAnalyticsStatusCount = {
  status: InquiryStatus;
  count: number;
};

export type BusinessAnalyticsTrendPoint = {
  label: string;
  weekStart: string;
  inquiries: number;
  won: number;
  lost: number;
  acceptedQuotes: number;
};

export type BusinessAnalyticsData = {
  totalInquiries: number;
  inquiriesThisWeek: number;
  wonCount: number;
  lostCount: number;
  inquiryStatusCounts: BusinessAnalyticsStatusCount[];
  quoteSummary: {
    totalQuotes: number;
    sentQuotes: number;
    acceptedQuotes: number;
    rejectedQuotes: number;
    expiredQuotes: number;
    linkedInquiryCount: number;
    acceptanceRate: number;
    inquiryCoverageRate: number;
    averageQuoteValueInCents: number;
  };
  recentTrend: BusinessAnalyticsTrendPoint[];
};

// ---------------------------------------------------------------------------
// Conversion analytics
// ---------------------------------------------------------------------------

export type ConversionTrendPoint = {
  label: string;
  weekStart: string;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
};

export type ConversionAnalyticsData = {
  inquiryToQuoteRate: number;
  quoteToAcceptanceRate: number;
  acceptedValueInCents: number;
  pendingValueInCents: number;
  rejectedValueInCents: number;
  averageAcceptedValueInCents: number;
  quotesStatusTrend: ConversionTrendPoint[];
};

// ---------------------------------------------------------------------------
// Workflow analytics
// ---------------------------------------------------------------------------

export type WorkflowAnalyticsData = {
  avgTimeToQuoteHours: number | null;
  avgTimeSentToDecisionHours: number | null;
  staleInquiryCount: number;
  pendingQuotesOverSevenDays: number;
};
