import {
  CheckCircle2,
  Eye,
  FileText,
  GitCompareArrows,
  Inbox,
  XCircle,
} from "lucide-react";

import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import { DrillDownLink } from "@/features/analytics/components/drill-down-link";
import { MiniSparkline } from "@/features/analytics/components/mini-sparkline";
import type {
  FreeAnalyticsData,
  MetricSparklineData,
  PeriodDeltaDirection,
} from "@/features/analytics/types";
import { formatPercent } from "@/features/analytics/utils";
import {
  getBusinessInquiriesPath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";

function getDirection(points: number[]): PeriodDeltaDirection {
  if (points.length < 2) return "flat";
  const first = points[0];
  const last = points[points.length - 1];
  if (last > first) return "up";
  if (last < first) return "down";
  return "flat";
}

export function BasicAnalyticsView({
  data,
  sparklines,
  businessSlug,
}: {
  data: FreeAnalyticsData;
  sparklines?: MetricSparklineData | null;
  businessSlug?: string;
}) {
  const hasDrillDown = !!businessSlug;
  const inquiriesPath = businessSlug ? getBusinessInquiriesPath(businessSlug) : "";
  const quotesPath = businessSlug ? getBusinessQuotesPath(businessSlug) : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Traffic */}
      <div>
        <h2 className="meta-label mb-4">Traffic (last 30 days)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DrillDownLink href={inquiriesPath} enabled={hasDrillDown}>
            <AnalyticsMetricCard
              icon={Eye}
              title="Form views"
              value={`${data.formViews}`}
              description={`${data.uniqueVisitors} unique visitors`}
              tooltip="Times your public inquiry forms were viewed."
              sparkline={
                sparklines ? (
                  <MiniSparkline
                    points={sparklines.formViews}
                    direction={getDirection(sparklines.formViews)}
                  />
                ) : undefined
              }
            />
          </DrillDownLink>
          <DrillDownLink href={inquiriesPath} enabled={hasDrillDown}>
            <AnalyticsMetricCard
              icon={Inbox}
              title="Inquiries"
              value={`${data.inquirySubmissions}`}
              description={`${formatPercent(data.formConversionRate)} form conversion`}
              tooltip="Inquiries submitted through your forms."
              sparkline={
                sparklines ? (
                  <MiniSparkline
                    points={sparklines.inquirySubmissions}
                    direction={getDirection(sparklines.inquirySubmissions)}
                  />
                ) : undefined
              }
            />
          </DrillDownLink>
          <DrillDownLink href="" enabled={false}>
            <AnalyticsMetricCard
              icon={GitCompareArrows}
              title="Inquiry → quote"
              value={formatPercent(data.inquiryToQuoteRate)}
              description={`${data.inquiriesWithQuote} quoted of ${data.inquirySubmissions}`}
              tooltip="Percentage of inquiries that got at least one quote."
            />
          </DrillDownLink>
        </div>
      </div>

      {/* Quotes */}
      <div>
        <h2 className="meta-label mb-4">Quotes (last 30 days)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DrillDownLink
            href={hasDrillDown ? `${quotesPath}?status=sent` : ""}
            enabled={hasDrillDown}
          >
            <AnalyticsMetricCard
              icon={FileText}
              title="Sent"
              value={`${data.quotesSent}`}
              tooltip="Quotes sent to customers."
              sparkline={
                sparklines ? (
                  <MiniSparkline
                    points={sparklines.quotesSent}
                    direction={getDirection(sparklines.quotesSent)}
                  />
                ) : undefined
              }
            />
          </DrillDownLink>
          <DrillDownLink
            href={hasDrillDown ? `${quotesPath}?status=viewed` : ""}
            enabled={hasDrillDown}
          >
            <AnalyticsMetricCard
              icon={Eye}
              title="Viewed"
              value={`${data.quotesViewed}`}
              tooltip="Sent quotes opened by customers."
              sparkline={
                sparklines ? (
                  <MiniSparkline
                    points={sparklines.quotesViewed}
                    direction={getDirection(sparklines.quotesViewed)}
                  />
                ) : undefined
              }
            />
          </DrillDownLink>
          <DrillDownLink
            href={hasDrillDown ? `${quotesPath}?status=accepted` : ""}
            enabled={hasDrillDown}
          >
            <AnalyticsMetricCard
              icon={CheckCircle2}
              title="Accepted"
              value={`${data.quotesAccepted}`}
              description={`${formatPercent(data.quoteAcceptanceRate)} acceptance rate`}
              tooltip="Quotes accepted by customers."
              sparkline={
                sparklines ? (
                  <MiniSparkline
                    points={sparklines.quotesAccepted}
                    direction={getDirection(sparklines.quotesAccepted)}
                  />
                ) : undefined
              }
            />
          </DrillDownLink>
          <DrillDownLink
            href={hasDrillDown ? `${quotesPath}?status=rejected` : ""}
            enabled={hasDrillDown}
          >
            <AnalyticsMetricCard
              icon={XCircle}
              title="Rejected"
              value={`${data.quotesRejected}`}
              tooltip="Quotes rejected by customers."
              sparkline={
                sparklines ? (
                  <MiniSparkline
                    points={sparklines.quotesRejected}
                    direction={getDirection(sparklines.quotesRejected)}
                  />
                ) : undefined
              }
            />
          </DrillDownLink>
        </div>
      </div>
    </div>
  );
}
