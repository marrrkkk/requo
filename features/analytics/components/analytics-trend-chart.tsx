"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { AnalyticsChartCard } from "@/features/analytics/components/analytics-chart-card";
import type { TrendPoint } from "@/features/analytics/types";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function AnalyticsTrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <AnalyticsChartCard
      title="12-week trend"
      description="Weekly views, submissions, quotes sent, and accepted."
    >
      <ChartContainer
        className="h-full min-h-[280px] w-full flex-1"
        config={{
          formViews: { label: "Form views", color: "hsl(var(--primary))" },
          inquirySubmissions: { label: "Inquiries", color: "hsl(var(--ring))" },
          quotesSent: { label: "Quotes sent", color: "hsl(var(--foreground))" },
          acceptedQuotes: {
            label: "Accepted",
            color: "hsl(var(--muted-foreground))",
          },
        }}
      >
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            type="monotone"
            dataKey="inquirySubmissions"
            stroke="var(--color-inquirySubmissions)"
            fill="var(--color-inquirySubmissions)"
            fillOpacity={0.08}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="quotesSent"
            stroke="var(--color-quotesSent)"
            fill="var(--color-quotesSent)"
            fillOpacity={0.06}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="acceptedQuotes"
            stroke="var(--color-acceptedQuotes)"
            fill="var(--color-acceptedQuotes)"
            fillOpacity={0.06}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="formViews"
            stroke="var(--color-formViews)"
            fill="var(--color-formViews)"
            fillOpacity={0.06}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </AnalyticsChartCard>
  );
}
