"use client";

import { useId, useState } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

/**
 * BoardUI Revenue Chart Card, restyled onto Requo tokens per this repo's
 * BoardUI migration convention (see dashboard-sidebar, stat-cards): the app
 * does not load the BoardUI theme layer, so the card's frame, type, delta
 * pill, and chart palette ride the Requo tokens instead.
 *
 * A year of monthly revenue drawn against the year before. The current year
 * is the filled area and solid line, last year the dashed line behind it, so
 * the gap between them is the story. Hovering a month swaps the headline for
 * that month's figure and shows what it was a year earlier. The count-up
 * headline and the delta pill follow the footer stat cards, so it sits below
 * the KPI row as part of the same dashboard block.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type RevenuePoint = {
  /** Short month label on the axis. */
  label: string;
  /** Revenue this year, in the card's currency. */
  current: number;
  /** Revenue for the same month a year earlier. */
  previous: number;
};

/** Pill tint by sentiment — the same readout the footer stat cards use. */
const DELTA_STYLES = {
  lime: "bg-success/10 text-success",
  rose: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
} as const;

function getCurrencySymbol(currency: string) {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? "$";
}

const formatK = (value: number, symbol: string) =>
  value >= 1000 ? `${symbol}${Math.round(value / 1000)}k` : `${symbol}${value}`;
const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

function describeDelta(current: number, previous: number) {
  if (previous === 0) return { label: "New", color: "neutral" as const };
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return { label: "0%", color: "neutral" as const };
  return {
    label: `${rounded > 0 ? "+" : ""}${rounded}%`,
    color: rounded > 0 ? ("lime" as const) : ("rose" as const),
  };
}

/** The active month's marker on the current-year line. */
function ActiveDot({ cx: x, cy: y }: { cx?: number; cy?: number }) {
  if (x === undefined || y === undefined) return null;
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill="var(--chart-2)" opacity={0.25} />
      <circle
        cx={x}
        cy={y}
        r={4}
        fill="var(--chart-2)"
        stroke="var(--card)"
        strokeWidth={2}
      />
    </g>
  );
}

export function RevenueChartCard({
  data,
  currency = "USD",
  title = "Revenue",
  className,
}: {
  /** Twelve points, one per month. */
  data: RevenuePoint[];
  /** ISO currency code the figures are denominated in. */
  currency?: string;
  /** Headline label when no month is hovered. */
  title?: string;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();
  const symbol = getCurrencySymbol(currency);

  const totalCurrent = data.reduce((sum, point) => sum + point.current, 0);
  const totalPrevious = data.reduce((sum, point) => sum + point.previous, 0);
  const hovering = activeIndex !== null && activeIndex < data.length;
  const point = hovering ? data[activeIndex] : null;

  const headlineValue = point ? point.current : totalCurrent;
  const comparison = point ? point.previous : totalPrevious;
  const delta = describeDelta(headlineValue, comparison);
  const monthIndex = point ? MONTHS.indexOf(point.label) : -1;
  const label = point ? (monthIndex >= 0 ? MONTHS_FULL[monthIndex] : point.label) : title;
  const display = useCountUp(Math.round(headlineValue / 100));

  const yMax = Math.max(...data.map((d) => Math.max(d.current, d.previous)));

  return (
    <section
      className={cn(
        "flex h-[344px] min-w-0 flex-1 flex-col gap-6 rounded-2xl border border-border/60 bg-card px-4 pt-4 pb-3",
        className,
      )}
    >
      {/* Header: label over the count-up figure and its delta; legend on the right */}
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="w-full text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex w-full items-center gap-2">
            <p
              key={activeIndex ?? "total"}
              className="animate-number-fade whitespace-nowrap text-2xl font-semibold tracking-tight text-foreground tabular-nums"
            >
              {formatMoney(display, currency)}
            </p>
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
                DELTA_STYLES[delta.color],
              )}
            >
              {delta.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatMoney(comparison, currency)} {point ? "a year earlier" : "last year"}
          </p>
        </div>
        <dl className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-2" aria-hidden />
            <dt>This year</dt>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground" aria-hidden />
            <dt>Last year</dt>
          </div>
        </dl>
      </div>

      {/* Chart */}
      <div className="min-h-0 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 6, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const index = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(index)) setActiveIndex(index);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis
              width={44}
              domain={[0, yMax * 1.1]}
              tickCount={4}
              tickFormatter={(value: number) => formatK(value, symbol)}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              interval="preserveStartEnd"
              tick={{ fontSize: 13, fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              content={() => null}
              cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              isAnimationActive
              animationDuration={450}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke="none"
              fill={`url(#${gradientId})`}
              isAnimationActive
              animationDuration={450}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="var(--chart-2)"
              strokeWidth={2.5}
              dot={false}
              activeDot={<ActiveDot />}
              isAnimationActive
              animationDuration={450}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
