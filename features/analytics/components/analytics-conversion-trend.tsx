"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  accepted: {
    label: "Accepted",
    color: "oklch(0.765 0.177 163.223)",
  },
  sent: {
    label: "Pending",
    color: "oklch(0.715 0.143 215.221)",
  },
  rejected: {
    label: "Rejected",
    color: "oklch(0.637 0.237 25.331)",
  },
  expired: {
    label: "Expired",
    color: "oklch(0.705 0.191 47.604)",
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
        <CardTitle>Quote status trend</CardTitle>
        <CardDescription>
          Six-week breakdown by outcome.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            data={points}
            barCategoryGap="20%"
          >
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
            <Bar
              dataKey="accepted"
              stackId="quotes"
              fill="var(--color-accepted)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="sent"
              stackId="quotes"
              fill="var(--color-sent)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="rejected"
              stackId="quotes"
              fill="var(--color-rejected)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="expired"
              stackId="quotes"
              fill="var(--color-expired)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
