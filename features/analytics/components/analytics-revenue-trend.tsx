"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { RevenueTrendPoint } from "@/features/analytics/types";

const chartConfig = {
  acceptedValueInCents: {
    label: "Accepted value",
    color: "oklch(0.765 0.177 163.223)",
  },
} satisfies ChartConfig;

function formatRevenueTick(value: number) {
  if (value === 0) return "$0";
  if (value >= 100_000_00) return `$${Math.round(value / 100_00) / 10}k`;
  return `$${Math.round(value / 100)}`;
}

function formatRevenueTooltip(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function AnalyticsRevenueTrend({
  points,
}: {
  points: RevenueTrendPoint[];
}) {
  const hasData = points.some((point) => point.acceptedValueInCents > 0);

  if (!hasData) {
    return null;
  }

  return (
    <Card className="gap-0">
      <CardHeader className="gap-2">
        <CardTitle>Revenue trend</CardTitle>
        <CardDescription>
          Weekly accepted quote value over the last 12 weeks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-acceptedValueInCents)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-acceptedValueInCents)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
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
              width={48}
              tickFormatter={formatRevenueTick}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => formatRevenueTooltip(Number(value))}
                />
              }
            />
            <Area
              dataKey="acceptedValueInCents"
              stroke="var(--color-acceptedValueInCents)"
              strokeWidth={2.25}
              fill="url(#fillRevenue)"
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
