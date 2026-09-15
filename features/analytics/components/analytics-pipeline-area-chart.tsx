"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TrendPoint } from "@/features/analytics/types";

const chartConfig = {
  inquirySubmissions: { label: "Inquiries", color: "var(--chart-1)" },
  quotesSent: { label: "Quotes sent", color: "var(--chart-2)" },
  acceptedQuotes: { label: "Accepted", color: "var(--chart-3)" },
} satisfies ChartConfig;

/**
 * Stacked area matching the reference "Visitors" card: inquiries, quotes
 * sent, and accepted quotes accumulate across the 12-week trend. Legend
 * tiles below mirror the reference totals row.
 */
export function AnalyticsPipelineAreaChart({ points }: { points: TrendPoint[] }) {
  const totals = {
    inquirySubmissions: points.reduce((sum, p) => sum + p.inquirySubmissions, 0),
    quotesSent: points.reduce((sum, p) => sum + p.quotesSent, 0),
    acceptedQuotes: points.reduce((sum, p) => sum + p.acceptedQuotes, 0),
  };

  if (
    totals.inquirySubmissions === 0 &&
    totals.quotesSent === 0 &&
    totals.acceptedQuotes === 0
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        No pipeline activity in this window — the trend appears here as inquiries flow in.
      </p>
    );
  }

  const tiles = [
    { key: "inquirySubmissions", label: "Inquiries", total: totals.inquirySubmissions, dot: "bg-chart-1" },
    { key: "quotesSent", label: "Quotes sent", total: totals.quotesSent, dot: "bg-chart-2" },
    { key: "acceptedQuotes", label: "Accepted", total: totals.acceptedQuotes, dot: "bg-chart-3" },
  ] as const;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ChartContainer config={chartConfig} className="h-full min-h-48 w-full flex-1">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <Area
            type="monotone"
            dataKey="inquirySubmissions"
            stackId="pipeline"
            stroke="var(--color-inquirySubmissions)"
            fill="var(--color-inquirySubmissions)"
            fillOpacity={0.22}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="quotesSent"
            stackId="pipeline"
            stroke="var(--color-quotesSent)"
            fill="var(--color-quotesSent)"
            fillOpacity={0.22}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="acceptedQuotes"
            stackId="pipeline"
            stroke="var(--color-acceptedQuotes)"
            fill="var(--color-acceptedQuotes)"
            fillOpacity={0.22}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {tiles.map((tile) => (
          <p key={tile.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`size-2 rounded-full ${tile.dot}`} aria-hidden="true" />
            {tile.label}
            <span className="font-semibold tabular-nums text-foreground">
              {tile.total.toLocaleString()}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
