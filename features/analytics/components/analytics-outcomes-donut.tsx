"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { FreeAnalyticsData } from "@/features/analytics/types";
import { formatPercent } from "@/features/analytics/utils";
import { cn } from "@/lib/utils";

type OutcomeSlice = {
  key: string;
  label: string;
  count: number;
  fill: string;
};

const chartConfig = {
  viewed: { label: "Viewed", color: "var(--chart-2)" },
  accepted: { label: "Accepted", color: "var(--chart-1)" },
  rejected: { label: "Rejected", color: "var(--chart-3)" },
  expired: { label: "Expired", color: "var(--chart-4)" },
} satisfies ChartConfig;

/**
 * Half-donut of quote outcomes matching the reference "Spend by channel"
 * card: the center reads the acceptance rate while legend tiles below break
 * out each outcome count. Built on the shadcn chart primitives.
 */
export function AnalyticsOutcomesDonut({ data }: { data: FreeAnalyticsData }) {
  const slices: OutcomeSlice[] = [
    { key: "viewed", label: "Viewed", count: data.quotesViewed, fill: "var(--color-viewed)" },
    { key: "accepted", label: "Accepted", count: data.quotesAccepted, fill: "var(--color-accepted)" },
    { key: "rejected", label: "Rejected", count: data.quotesRejected, fill: "var(--color-rejected)" },
    { key: "expired", label: "Expired", count: data.quotesExpired, fill: "var(--color-expired)" },
  ];

  const total = slices.reduce((sum, s) => sum + s.count, 0);

  if (data.quotesSent === 0 || total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No quote outcomes yet — send quotes to see how customers respond.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto w-full max-w-64">
        <ChartContainer config={chartConfig} className="aspect-[2/1] h-auto w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel indicator="dot" />} />
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              startAngle={180}
              endAngle={0}
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={3}
              cornerRadius={8}
              strokeWidth={0}
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatPercent(data.quoteAcceptanceRate)}
          </p>
          <p className="meta-label">Accepted</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {slices.map((slice) => (
          <div key={slice.key} className="flex min-w-0 items-center gap-2">
            <span
              className={cn("size-2 shrink-0 rounded-full")}
              style={{ backgroundColor: slice.fill }}
              aria-hidden="true"
            />
            <span className="truncate text-xs text-muted-foreground">{slice.label}</span>
            <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {slice.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
