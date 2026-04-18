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
import type { BusinessAnalyticsTrendPoint } from "@/features/analytics/types";

const chartConfig = {
  formViews: {
    label: "Form views",
    color: "oklch(0.623 0.214 259.815)",
  },
  inquirySubmissions: {
    label: "Inquiries",
    color: "oklch(0.704 0.14 171.77)",
  },
  quotesSent: {
    label: "Quotes sent",
    color: "oklch(0.744 0.16 79.64)",
  },
  acceptedQuotes: {
    label: "Accepted quotes",
    color: "oklch(0.765 0.177 163.223)",
  },
} satisfies ChartConfig;

export function AnalyticsTrendOverview({
  points,
}: {
  points: BusinessAnalyticsTrendPoint[];
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="gap-2">
        <CardTitle>Funnel trend</CardTitle>
        <CardDescription>
          Last 12 weeks of form traffic, inquiries, and quote movement.
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
              dataKey="formViews"
              stroke="var(--color-formViews)"
              strokeWidth={2.25}
              dot={false}
              type="monotone"
            />
            <Line
              dataKey="inquirySubmissions"
              stroke="var(--color-inquirySubmissions)"
              strokeWidth={2.25}
              dot={false}
              type="monotone"
            />
            <Line
              dataKey="quotesSent"
              stroke="var(--color-quotesSent)"
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
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
