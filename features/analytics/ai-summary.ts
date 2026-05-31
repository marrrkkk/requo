import "server-only";

import { generateWithFallback, isAiConfigured } from "@/lib/ai";
import type { FreeAnalyticsData, BusinessAnalyticsData } from "@/features/analytics/types";

type AISummaryMetrics = {
  formViews: number;
  inquirySubmissions: number;
  quotesSent: number;
  quotesAccepted: number;
  quotesRejected: number;
  formConversionRate: number;
  quoteAcceptanceRate: number;
  priorPeriod?: {
    formViews: number;
    inquirySubmissions: number;
    quotesSent: number;
    quotesAccepted: number;
  };
  revenue?: {
    acceptedValueInCents: number;
    averageAcceptedValueInCents: number;
  };
  alerts?: {
    staleInquiryCount: number;
    pendingQuotesOverSevenDays: number;
  };
};

function computeDeltas(current: number, prior: number): string {
  if (prior === 0 && current === 0) return "no change";
  if (prior === 0) return `+${current} (new)`;
  const pctChange = Math.round(((current - prior) / prior) * 100);
  if (pctChange > 0) return `+${pctChange}%`;
  if (pctChange < 0) return `${pctChange}%`;
  return "no change";
}

function buildPrompt(metrics: AISummaryMetrics): string {
  const lines: string[] = [
    "You are an analytics assistant for a service business. Describe the most notable trend or anomaly from these analytics metrics in exactly one sentence. Be specific, concise, and actionable.",
    "",
    "Current period metrics:",
    `- Form views: ${metrics.formViews}`,
    `- Inquiry submissions: ${metrics.inquirySubmissions}`,
    `- Quotes sent: ${metrics.quotesSent}`,
    `- Quotes accepted: ${metrics.quotesAccepted}`,
    `- Quotes rejected: ${metrics.quotesRejected}`,
    `- Form conversion rate: ${(metrics.formConversionRate * 100).toFixed(1)}%`,
    `- Quote acceptance rate: ${(metrics.quoteAcceptanceRate * 100).toFixed(1)}%`,
  ];

  if (metrics.priorPeriod) {
    lines.push(
      "",
      "Period-over-period changes:",
      `- Form views: ${computeDeltas(metrics.formViews, metrics.priorPeriod.formViews)}`,
      `- Inquiries: ${computeDeltas(metrics.inquirySubmissions, metrics.priorPeriod.inquirySubmissions)}`,
      `- Quotes sent: ${computeDeltas(metrics.quotesSent, metrics.priorPeriod.quotesSent)}`,
      `- Quotes accepted: ${computeDeltas(metrics.quotesAccepted, metrics.priorPeriod.quotesAccepted)}`,
    );
  }

  if (metrics.revenue) {
    lines.push(
      "",
      `- Accepted revenue: $${(metrics.revenue.acceptedValueInCents / 100).toFixed(2)}`,
      `- Average quote value: $${(metrics.revenue.averageAcceptedValueInCents / 100).toFixed(2)}`,
    );
  }

  if (metrics.alerts) {
    lines.push(
      "",
      `- Stale inquiries (no response 48+ hours): ${metrics.alerts.staleInquiryCount}`,
      `- Pending quotes (7+ days, no response): ${metrics.alerts.pendingQuotesOverSevenDays}`,
    );
  }

  lines.push(
    "",
    "Respond with one sentence only. Do not include bullet points, labels, or prefixes.",
  );

  return lines.join("\n");
}

/**
 * Generates a one-sentence AI summary of the current analytics data.
 * Returns null if AI is not configured or generation fails.
 */
export async function generateAnalyticsSummary(
  freeData: FreeAnalyticsData,
  businessData: BusinessAnalyticsData | null,
  priorPeriod?: {
    formViews: number;
    inquirySubmissions: number;
    quotesSent: number;
    quotesAccepted: number;
  },
): Promise<string | null> {
  if (!isAiConfigured()) {
    return null;
  }

  const metrics: AISummaryMetrics = {
    formViews: freeData.formViews,
    inquirySubmissions: freeData.inquirySubmissions,
    quotesSent: freeData.quotesSent,
    quotesAccepted: freeData.quotesAccepted,
    quotesRejected: freeData.quotesRejected,
    formConversionRate: freeData.formConversionRate,
    quoteAcceptanceRate: freeData.quoteAcceptanceRate,
    priorPeriod,
    revenue: businessData
      ? {
          acceptedValueInCents: businessData.revenue.acceptedValueInCents,
          averageAcceptedValueInCents: businessData.revenue.averageAcceptedValueInCents,
        }
      : undefined,
    alerts: businessData
      ? {
          staleInquiryCount: businessData.alerts.staleInquiryCount,
          pendingQuotesOverSevenDays: businessData.alerts.pendingQuotesOverSevenDays,
        }
      : undefined,
  };

  const prompt = buildPrompt(metrics);

  try {
    const response = await generateWithFallback({
      model: "",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      maxOutputTokens: 150,
      qualityTier: "cheap",
    });

    const summary = response.text.trim();
    // Return null if the response is empty or unreasonably long
    if (!summary || summary.length > 500) {
      return null;
    }

    return summary;
  } catch (error) {
    console.warn("[analytics] AI summary generation failed:", error);
    return null;
  }
}
