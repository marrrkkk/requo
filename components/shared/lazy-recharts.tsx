"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyErrorBoundary } from "@/components/shared/lazy-error-boundary";

/**
 * Skeleton placeholder for chart components.
 * Matches typical chart container dimensions (100% width, min-height 280px).
 * Adds < 2 KB JS and prevents CLS by reserving the full container space.
 */
function ChartSkeleton() {
  return (
    <div className="flex h-full min-h-[280px] w-full flex-col gap-3 p-4">
      {/* Y-axis + chart area */}
      <div className="flex flex-1 gap-2">
        <div className="flex flex-col justify-between py-2">
          <Skeleton className="h-3 w-6 rounded-sm" />
          <Skeleton className="h-3 w-6 rounded-sm" />
          <Skeleton className="h-3 w-6 rounded-sm" />
          <Skeleton className="h-3 w-6 rounded-sm" />
        </div>
        <Skeleton className="flex-1 rounded-lg" />
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between px-8">
        <Skeleton className="h-3 w-8 rounded-sm" />
        <Skeleton className="h-3 w-8 rounded-sm" />
        <Skeleton className="h-3 w-8 rounded-sm" />
        <Skeleton className="h-3 w-8 rounded-sm" />
        <Skeleton className="h-3 w-8 rounded-sm" />
      </div>
    </div>
  );
}

// ssr: false — Recharts relies on browser DOM APIs (SVG measurement, ResizeObserver) for chart rendering
const InternalBasicTrendChart = dynamic(
  () =>
    import("@/features/analytics/components/basic-trend-chart").then(
      (mod) => mod.BasicTrendChart
    ),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// ssr: false — Recharts relies on browser DOM APIs (SVG measurement, ResizeObserver) for chart rendering
const InternalAnalyticsTrendChart = dynamic(
  () =>
    import("@/features/analytics/components/analytics-trend-chart").then(
      (mod) => mod.AnalyticsTrendChart
    ),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

/**
 * Lazy-loaded BasicTrendChart — only downloads Recharts when rendered.
 * Wrapped in an error boundary that catches chunk download failures and
 * offers a retry button to re-attempt the import.
 */
export function LazyBasicTrendChart(
  props: ComponentProps<typeof InternalBasicTrendChart>
) {
  return (
    <LazyErrorBoundary>
      <InternalBasicTrendChart {...props} />
    </LazyErrorBoundary>
  );
}

/**
 * Lazy-loaded AnalyticsTrendChart — only downloads Recharts when rendered.
 * Wrapped in an error boundary that catches chunk download failures and
 * offers a retry button to re-attempt the import.
 */
export function LazyAnalyticsTrendChart(
  props: ComponentProps<typeof InternalAnalyticsTrendChart>
) {
  return (
    <LazyErrorBoundary>
      <InternalAnalyticsTrendChart {...props} />
    </LazyErrorBoundary>
  );
}

export { ChartSkeleton };
