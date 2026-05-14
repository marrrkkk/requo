/**
 * Static placeholder data for premium content previews.
 *
 * Used by PremiumContentBlur to render blurred previews of locked features.
 * All data is hardcoded and clearly fake — no real user, business, or account
 * records are referenced.
 *
 * @see Requirements 7.2, 7.3
 */

import type { PlanFeature } from "@/lib/plans/entitlements";

// ── Analytics: Conversion ────────────────────────────────────────────────────

export type PlaceholderConversionSummary = {
  inquirySubmissions: number;
  inquiriesWithQuote: number;
  quotesSent: number;
  quotesViewed: number;
  quotesAccepted: number;
  quotesRejected: number;
  inquiryToQuoteRate: number;
  quoteViewRate: number;
  quoteAcceptanceRate: number;
  acceptedValueInCents: number;
  averageAcceptedValueInCents: number;
};

export type PlaceholderConversionTrendPoint = {
  label: string;
  weekStart: string;
  quotesSent: number;
  quoteViews: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
};

export type PlaceholderConversionFunnel = {
  inquirySubmissions: number;
  inquiriesWithQuote: number;
  quotesSent: number;
  quotesViewed: number;
  quotesAccepted: number;
};

export type PlaceholderConversionData = {
  summary: PlaceholderConversionSummary;
  funnel: PlaceholderConversionFunnel;
  trend: PlaceholderConversionTrendPoint[];
};

export const placeholderConversionData: PlaceholderConversionData = {
  summary: {
    inquirySubmissions: 48,
    inquiriesWithQuote: 32,
    quotesSent: 29,
    quotesViewed: 24,
    quotesAccepted: 14,
    quotesRejected: 6,
    inquiryToQuoteRate: 66.7,
    quoteViewRate: 82.8,
    quoteAcceptanceRate: 58.3,
    acceptedValueInCents: 287_500_00,
    averageAcceptedValueInCents: 20_535_71,
  },
  funnel: {
    inquirySubmissions: 48,
    inquiriesWithQuote: 32,
    quotesSent: 29,
    quotesViewed: 24,
    quotesAccepted: 14,
  },
  trend: [
    { label: "Week 1", weekStart: "2024-10-07", quotesSent: 5, quoteViews: 4, acceptedQuotes: 2, rejectedQuotes: 1 },
    { label: "Week 2", weekStart: "2024-10-14", quotesSent: 7, quoteViews: 6, acceptedQuotes: 3, rejectedQuotes: 1 },
    { label: "Week 3", weekStart: "2024-10-21", quotesSent: 6, quoteViews: 5, acceptedQuotes: 4, rejectedQuotes: 0 },
    { label: "Week 4", weekStart: "2024-10-28", quotesSent: 8, quoteViews: 7, acceptedQuotes: 3, rejectedQuotes: 2 },
    { label: "Week 5", weekStart: "2024-11-04", quotesSent: 3, quoteViews: 2, acceptedQuotes: 2, rejectedQuotes: 2 },
  ],
};

// ── Analytics: Workflow ───────────────────────────────────────────────────────

export type PlaceholderWorkflowSummary = {
  responseRate: number;
  avgFirstResponseHours: number;
  avgTimeToFirstQuoteHours: number;
  avgTimeSentToDecisionHours: number;
  quotesSent: number;
  quotesAccepted: number;
  quotesRejected: number;
  staleInquiryCount: number;
  pendingQuotesOverSevenDays: number;
};

export type PlaceholderFollowUpSummary = {
  created: number;
  completed: number;
  skipped: number;
  overdue: number;
  completionRate: number;
  avgDaysToComplete: number;
};

export type PlaceholderWorkflowData = {
  summary: PlaceholderWorkflowSummary;
  followUps: PlaceholderFollowUpSummary;
};

export const placeholderWorkflowData: PlaceholderWorkflowData = {
  summary: {
    responseRate: 91.7,
    avgFirstResponseHours: 3.2,
    avgTimeToFirstQuoteHours: 18.5,
    avgTimeSentToDecisionHours: 52.1,
    quotesSent: 29,
    quotesAccepted: 14,
    quotesRejected: 6,
    staleInquiryCount: 3,
    pendingQuotesOverSevenDays: 2,
  },
  followUps: {
    created: 22,
    completed: 17,
    skipped: 3,
    overdue: 2,
    completionRate: 77.3,
    avgDaysToComplete: 2.4,
  },
};

// ── AI Suggestions ───────────────────────────────────────────────────────────

export type PlaceholderAiSuggestion = {
  id: string;
  title: string;
  preview: string;
};

export type PlaceholderAiQuoteDraft = {
  title: string;
  notes: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceInCents: number;
  }>;
};

export type PlaceholderAiData = {
  suggestions: PlaceholderAiSuggestion[];
  quoteDraft: PlaceholderAiQuoteDraft;
};

export const placeholderAiData: PlaceholderAiData = {
  suggestions: [
    {
      id: "placeholder-ai-1",
      title: "Suggested reply for Acme Corp inquiry",
      preview:
        "Hi Jordan, thanks for reaching out about the kitchen renovation. Based on your timeline and budget range, I'd recommend starting with a site visit next week to…",
    },
    {
      id: "placeholder-ai-2",
      title: "Follow-up recommendation",
      preview:
        "It's been 3 days since you sent the quote to Maple & Co. Consider a friendly check-in to see if they have questions about the scope or pricing.",
    },
    {
      id: "placeholder-ai-3",
      title: "Quote pricing insight",
      preview:
        "Based on your recent accepted quotes, similar projects average $4,200. The current quote is 15% below that — consider adjusting if scope allows.",
    },
  ],
  quoteDraft: {
    title: "Website Redesign — Acme Corp",
    notes: "Includes responsive design, CMS integration, and two rounds of revisions. Timeline: 4–6 weeks from approval.",
    items: [
      { description: "Discovery & wireframes", quantity: 1, unitPriceInCents: 150_000 },
      { description: "Visual design (up to 8 pages)", quantity: 1, unitPriceInCents: 350_000 },
      { description: "Development & CMS setup", quantity: 1, unitPriceInCents: 450_000 },
      { description: "QA & launch support", quantity: 1, unitPriceInCents: 100_000 },
    ],
  },
};

// ── Reports / Exports ────────────────────────────────────────────────────────

export type PlaceholderReportRow = {
  customerName: string;
  quoteTitle: string;
  status: string;
  totalInCents: number;
  sentAt: string;
};

export type PlaceholderReportData = {
  rows: PlaceholderReportRow[];
  generatedAt: string;
};

export const placeholderReportData: PlaceholderReportData = {
  rows: [
    { customerName: "Acme Corp", quoteTitle: "Office Renovation Phase 1", status: "Accepted", totalInCents: 875_000, sentAt: "2024-10-15" },
    { customerName: "Maple & Co", quoteTitle: "Brand Identity Package", status: "Viewed", totalInCents: 420_000, sentAt: "2024-10-18" },
    { customerName: "Northwind Traders", quoteTitle: "Monthly Retainer — Q4", status: "Sent", totalInCents: 650_000, sentAt: "2024-10-22" },
    { customerName: "Contoso Ltd", quoteTitle: "Event Photography Bundle", status: "Accepted", totalInCents: 310_000, sentAt: "2024-10-25" },
    { customerName: "Fabrikam Inc", quoteTitle: "SEO Audit & Strategy", status: "Rejected", totalInCents: 280_000, sentAt: "2024-10-28" },
  ],
  generatedAt: "2024-11-01",
};

// ── Feature-scoped lookup ────────────────────────────────────────────────────

/**
 * Maps PlanFeature identifiers to their corresponding placeholder data.
 * Only features that use PremiumContentBlur have placeholder data defined.
 * Returns `null` for features that don't have blurred preview content.
 */
export type PlaceholderDataMap = {
  analyticsConversion: PlaceholderConversionData;
  analyticsWorkflow: PlaceholderWorkflowData;
  aiAssistant: PlaceholderAiData;
  exports: PlaceholderReportData;
};

export type PlaceholderFeature = keyof PlaceholderDataMap;

const placeholderDataMap: Record<PlaceholderFeature, PlaceholderDataMap[PlaceholderFeature]> = {
  analyticsConversion: placeholderConversionData,
  analyticsWorkflow: placeholderWorkflowData,
  aiAssistant: placeholderAiData,
  exports: placeholderReportData,
};

/**
 * Returns placeholder data for a given feature, or `null` if the feature
 * does not have blurred preview content.
 */
export function getPlaceholderData<F extends PlaceholderFeature>(
  feature: F,
): PlaceholderDataMap[F] {
  return placeholderDataMap[feature] as PlaceholderDataMap[F];
}

/**
 * Checks whether a feature has placeholder data available for blurred previews.
 */
export function hasPlaceholderData(feature: PlanFeature): feature is PlaceholderFeature {
  return feature in placeholderDataMap;
}
