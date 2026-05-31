"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

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

export function BasicTrendChart({
  since,
  until,
  sparklines,
}: {
  since: Date;
  until: Date;
  sparklines: MetricSparklineData;
}) {
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

