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

export type MetricSparklineData = {
  formViews: number[];
  inquirySubmissions: number[];
  quotesSent: number[];
  quotesAccepted: number[];
  quotesRejected: number[];
  quotesViewed: number[];
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

export type PipelineVelocity = {
  /** Median days from inquiry submission to quote acceptance, or null when fewer than 3 data points exist. */
  medianDays: number | null;
  dataPointCount: number;
};

export type RevenueForecast = {
  /** Projected pending-quote revenue in cents, or null when insufficient data. */
  forecastCents: number | null;
  pendingQuoteCount: number;
  historicalAcceptanceRate: number;
  averageQuoteValueCents: number;
};

export type CohortRow = {
  /** YYYY-MM month label of the customer's first inquiry. */
  cohortMonth: string;
  totalCustomers: number;
  returnedIn3Months: number;
  returnedIn6Months: number;
  returnedIn12Months: number;
};

export type BusinessAnalyticsData = {
  timing: WorkflowTimingData;
  alerts: OperationalAlerts;
  followUps: FollowUpSummary;
  revenue: RevenueSummary;
  ai: AiUsageSummary;
};
