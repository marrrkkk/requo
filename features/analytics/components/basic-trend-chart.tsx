"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

import type { MetricSparklineData } from "@/features/analytics/types";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type Point = {
  label: string;
  formViews: number;
  inquirySubmissions: number;
  quotesSent: number;
  quotesAccepted: number;
};

function buildSeries({
  since,
  until,
  sparklines,
}: {
  since: Date;
  until: Date;
  sparklines: MetricSparklineData;
}): Point[] {
  const start = new Date(since);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(until);
  end.setUTCHours(0, 0, 0, 0);

  const dayCount =
    Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    ) || 1;

  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

  return Array.from({ length: dayCount }).map((_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);

    return {
      label: fmt.format(d),
      formViews: sparklines.formViews[i] ?? 0,
      inquirySubmissions: sparklines.inquirySubmissions[i] ?? 0,
      quotesSent: sparklines.quotesSent[i] ?? 0,
      quotesAccepted: sparklines.quotesAccepted[i] ?? 0,
    };
  });
}

/** Returns true when every data series is all zeros. */
function isAllZeros(sparklines: MetricSparklineData): boolean {
  const allArrays = [
    sparklines.formViews,
    sparklines.inquirySubmissions,
    sparklines.quotesSent,
    sparklines.quotesAccepted,
  ];
  return allArrays.every((arr) => arr.every((v) => v === 0));
}

function TrendEmptyState() {
  return (
    <div className="flex h-full min-h-[280px] w-full flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-surface-muted/50 px-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-accent/85 text-muted-foreground">
        <TrendingUp className="size-4" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">No activity yet</p>
        <p className="text-sm text-muted-foreground">
          Activity will appear here as inquiries and quotes flow through your pipeline.
        </p>
      </div>
    </div>
  );
}

export function BasicTrendChart({
  since,
  until,
  sparklines,
}: {
  since: Date;
  until: Date;
  sparklines: MetricSparklineData;
}) {
  if (isAllZeros(sparklines)) {
    return <TrendEmptyState />;
  }

  const points = buildSeries({ since, until, sparklines });

  return (
    <ChartContainer
      className="h-full min-h-[280px] w-full flex-1"
      config={{
        formViews: { label: "Form views", color: "hsl(var(--primary))" },
        inquirySubmissions: { label: "Inquiries", color: "hsl(var(--ring))" },
        quotesSent: { label: "Quotes sent", color: "hsl(var(--foreground))" },
        quotesAccepted: {
          label: "Accepted",
          color: "hsl(var(--muted-foreground))",
        },
      }}
    >
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
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
          dataKey="quotesAccepted"
          stroke="var(--color-quotesAccepted)"
          fill="var(--color-quotesAccepted)"
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
  );
}

