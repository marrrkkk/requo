import type { InquiryStatus } from "@/features/inquiries/types";
import type { QuoteStatus } from "@/features/quotes/types";

export type BusinessAnalyticsStatusCount = {
  status: InquiryStatus;
  count: number;
};

export type BusinessAnalyticsTrendPoint = {
  label: string;
  weekStart: string;
  formViews: number;
  inquirySubmissions: number;
  quotesSent: number;
  acceptedQuotes: number;
};

export type BusinessAnalyticsData = {
  summary: {
    formViews: number;
    uniqueVisitors: number;
    inquirySubmissions: number;
    inquiriesWithQuote: number;
    formConversionRate: number;
    inquiryToQuoteRate: number;
    quotesSent: number;
    quotesViewed: number;
    quotesAccepted: number;
    quotesRejected: number;
    quoteAcceptanceRate: number;
    responseRate: number;
    avgFirstResponseHours: number | null;
    avgTimeToFirstQuoteHours: number | null;
    avgTimeSentToDecisionHours: number | null;
  };
  funnel: {
    uniqueVisitors: number;
    inquirySubmissions: number;
    inquiriesWithQuote: number;
    acceptedQuotes: number;
  };
  inquiryStatusCounts: BusinessAnalyticsStatusCount[];
  recentTrend: BusinessAnalyticsTrendPoint[];
  backlog: {
    staleInquiryCount: number;
    pendingQuotesOverSevenDays: number;
  };
};

export type ConversionTrendPoint = {
  label: string;
  weekStart: string;
  quotesSent: number;
  quoteViews: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
};

export type FormPerformanceAnalyticsRow = {
  formId: string;
  formName: string;
  formSlug: string;
  isDefault: boolean;
  publicInquiryEnabled: boolean;
  archivedAt: Date | null;
  viewCount: number;
  uniqueVisitorCount: number;
  submissionCount: number;
  inquiriesWithQuoteCount: number;
  sentQuoteCount: number;
  acceptedQuoteCount: number;
  formConversionRate: number;
  inquiryToQuoteRate: number;
  quoteAcceptanceRate: number;
};

export type ConversionAnalyticsData = {
  summary: {
    inquirySubmissions: number;
    inquiriesWithQuote: number;
    quotesSent: number;
    quotesViewed: number;
    quotePageViews: number;
    quotesAccepted: number;
    quotesRejected: number;
    inquiryToQuoteRate: number;
    quoteViewRate: number;
    quoteAcceptanceRate: number;
    acceptedValueInCents: number;
    averageAcceptedValueInCents: number;
  };
  funnel: {
    inquirySubmissions: number;
    inquiriesWithQuote: number;
    quotesSent: number;
    quotesViewed: number;
    quotesAccepted: number;
  };
  quotesTrend: ConversionTrendPoint[];
  formPerformance: FormPerformanceAnalyticsRow[];
};

export type WorkflowAnalyticsData = {
  summary: {
    responseRate: number;
    avgFirstResponseHours: number | null;
    avgTimeToFirstQuoteHours: number | null;
    avgTimeSentToDecisionHours: number | null;
    inquiryToQuoteRate: number;
    quotesSent: number;
    quotesViewed: number;
    quotesAccepted: number;
    quotesRejected: number;
    quotesVoided: number;
    quoteAcceptanceRate: number;
  };
  statusCounts: Array<{
    status: QuoteStatus;
    count: number;
  }>;
  alerts: {
    staleInquiryCount: number;
    pendingQuotesOverSevenDays: number;
  };
};
