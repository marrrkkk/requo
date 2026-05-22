export type PeriodDeltaDirection = "up" | "down" | "flat";

export type PeriodDelta = {
  value: number;
  direction: PeriodDeltaDirection;
};

export type FreeAnalyticsData = {
  formViews: number;
  uniqueVisitors: number;
  inquirySubmissions: number;
  inquiriesWithQuote: number;
  quotesSent: number;
  quotesViewed: number;
  quotesAccepted: number;
  quotesRejected: number;
  formConversionRate: number;
  inquiryToQuoteRate: number;
  quoteAcceptanceRate: number;
};

export type TrendPoint = {
  label: string;
  weekStart: string;
  formViews: number;
  inquirySubmissions: number;
  quotesSent: number;
  acceptedQuotes: number;
};

export type FunnelStep = {
  label: string;
  count: number;
};

export type FormPerformanceRow = {
  formId: string;
  formName: string;
  formSlug: string;
  isDefault: boolean;
  publicInquiryEnabled: boolean;
  archivedAt: Date | null;
  viewCount: number;
  uniqueVisitorCount: number;
  submissionCount: number;
  sentQuoteCount: number;
  acceptedQuoteCount: number;
  formConversionRate: number;
  quoteAcceptanceRate: number;
};

export type ProAnalyticsData = {
  priorPeriod: {
    formViews: number;
    inquirySubmissions: number;
    quotesSent: number;
    quotesAccepted: number;
  };
  trend: TrendPoint[];
  funnel: FunnelStep[];
  formPerformance: FormPerformanceRow[];
};

export type WorkflowTimingData = {
  avgFirstResponseHours: number | null;
  avgTimeToFirstQuoteHours: number | null;
  avgTimeSentToDecisionHours: number | null;
  responseRate: number;
};

export type OperationalAlerts = {
  staleInquiryCount: number;
  pendingQuotesOverSevenDays: number;
};

export type FollowUpSummary = {
  created: number;
  completed: number;
  skipped: number;
  overdue: number;
  completionRate: number;
  avgDaysToComplete: number | null;
};

export type RevenueSummary = {
  acceptedValueInCents: number;
  averageAcceptedValueInCents: number;
  completedValueInCents: number;
};

export type AiUsageSummary = {
  totalInvocations: number;
  totalTokens: number;
  estimatedCostCents: number;
};

export type BusinessAnalyticsData = {
  timing: WorkflowTimingData;
  alerts: OperationalAlerts;
  followUps: FollowUpSummary;
  revenue: RevenueSummary;
  ai: AiUsageSummary;
};
