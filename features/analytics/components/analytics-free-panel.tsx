import {
  CheckCircle2,
  Eye,
  FileText,
  GitCompareArrows,
  Inbox,
  XCircle,
} from "lucide-react";

import { DashboardStatsGrid } from "@/components/shared/dashboard-layout";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import type { FreeAnalyticsData } from "@/features/analytics/types";
import { formatPercent } from "@/features/analytics/utils";

export function AnalyticsFreePanel({ data }: { data: FreeAnalyticsData }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Traffic */}
      <div>
        <h2 className="meta-label mb-4">Traffic (last 30 days)</h2>
        <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-3">
          <AnalyticsMetricCard
            icon={Eye}
            title="Form views"
            value={`${data.formViews}`}
            description={`${data.uniqueVisitors} unique visitors`}
            tooltip="Times your public inquiry forms were viewed."
          />
          <AnalyticsMetricCard
            icon={Inbox}
            title="Inquiries"
            value={`${data.inquirySubmissions}`}
            description={`${formatPercent(data.formConversionRate)} form conversion`}
            tooltip="Inquiries submitted through your forms."
          />
          <AnalyticsMetricCard
            icon={GitCompareArrows}
            title="Inquiry → quote"
            value={formatPercent(data.inquiryToQuoteRate)}
            description={`${data.inquiriesWithQuote} quoted of ${data.inquirySubmissions}`}
            tooltip="Percentage of inquiries that got at least one quote."
          />
        </DashboardStatsGrid>
      </div>

      {/* Quotes */}
      <div>
        <h2 className="meta-label mb-4">Quotes (last 30 days)</h2>
        <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsMetricCard
            icon={FileText}
            title="Sent"
            value={`${data.quotesSent}`}
            tooltip="Quotes sent to customers."
          />
          <AnalyticsMetricCard
            icon={Eye}
            title="Viewed"
            value={`${data.quotesViewed}`}
            tooltip="Sent quotes opened by customers."
          />
          <AnalyticsMetricCard
            icon={CheckCircle2}
            title="Accepted"
            value={`${data.quotesAccepted}`}
            description={`${formatPercent(data.quoteAcceptanceRate)} acceptance rate`}
            tooltip="Quotes accepted by customers."
          />
          <AnalyticsMetricCard
            icon={XCircle}
            title="Rejected"
            value={`${data.quotesRejected}`}
            tooltip="Quotes rejected by customers."
          />
        </DashboardStatsGrid>
      </div>
    </div>
  );
}
