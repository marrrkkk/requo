"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ConversionTrendPoint } from "@/features/analytics/types";

const chartConfig = {
  quotesSent: {
    label: "Quotes sent",
    color: "oklch(0.715 0.143 215.221)",
  },
  quoteViews: {
    label: "Quote views",
    color: "oklch(0.623 0.214 259.815)",
  },
  acceptedQuotes: {
    label: "Accepted",
    color: "oklch(0.765 0.177 163.223)",
  },
  rejectedQuotes: {
    label: "Rejected",
    color: "oklch(0.637 0.237 25.331)",
  },
} satisfies ChartConfig;

export function AnalyticsConversionTrend({
  points,
}: {
  points: ConversionTrendPoint[];
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="gap-2">
        <CardTitle>Quote engagement trend</CardTitle>
        <CardDescription>
          Last 12 weeks of sent quotes, public views, and customer decisions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <LineChart data={points}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              fontSize={12}
              width={32}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="quotesSent"
              stroke="var(--color-quotesSent)"
              strokeWidth={2.25}
              dot={false}
              type="monotone"
            />
            <Line
              dataKey="quoteViews"
              stroke="var(--color-quoteViews)"
              strokeWidth={2.25}
              dot={false}
              type="monotone"
            />
            <Line
              dataKey="acceptedQuotes"
              stroke="var(--color-acceptedQuotes)"
              strokeWidth={2.25}
              dot={false}
              type="monotone"
            />
            <Line
              dataKey="rejectedQuotes"
              stroke="var(--color-rejectedQuotes)"
              strokeWidth={2.25}
              dot={false}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
