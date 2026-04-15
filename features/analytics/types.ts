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

export type BusinessAnalyticsActivityPoint = {
  date: string;       // ISO date string
  inquiries: number;
  quotes: number;
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
  activityGraph: {
    selectedYear: number;
    availableYears: number[];
    activityMap: Record<string, { inquiries: number; quotes: number }>; // map of ISO date -> counts
  };
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
