import { TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import type { RevenueForecast } from "@/features/analytics/types";
import { formatMoney, formatPercent } from "@/features/analytics/utils";

type RevenueForecastCardProps = {
  forecast: RevenueForecast;
  currency: string;
};

export function RevenueForecastCard({ forecast, currency }: RevenueForecastCardProps) {
  const { forecastCents, pendingQuoteCount, historicalAcceptanceRate, averageQuoteValueCents } =
    forecast;

  const isInsufficient = forecastCents === null;

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle>Revenue forecast</CardTitle>
        <CardDescription>
          {isInsufficient
            ? "Not enough data to project revenue."
            : "Projected revenue from pending quotes."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isInsufficient ? (
          <p className="text-sm text-muted-foreground">
            Insufficient data — send and close more quotes to enable forecasting.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsMetricCard
              icon={TrendingUp}
              title="Forecast"
              value={formatMoney(forecastCents, currency)}
              tooltip="Pending quotes × acceptance rate × avg value"
            />
            <AnalyticsMetricCard
              icon={TrendingUp}
              title="Pending quotes"
              value={`${pendingQuoteCount}`}
              description="Sent, awaiting response"
            />
            <AnalyticsMetricCard
              icon={TrendingUp}
              title="Acceptance rate"
              value={formatPercent(historicalAcceptanceRate)}
              description="Last 90 days"
            />
            <AnalyticsMetricCard
              icon={TrendingUp}
              title="Avg quote value"
              value={formatMoney(averageQuoteValueCents, currency)}
              description="Accepted, last 90 days"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
