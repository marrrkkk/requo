import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { analyticsBenchmarks, businesses } from "@/lib/db/schema";

import {
  BenchmarkComparison,
  buildBenchmarkComparison,
} from "../utils/benchmark-comparison";

type BusinessBenchmarkMetrics = {
  formConversionRate?: number;
  quoteAcceptanceRate?: number;
  avgResponseHours?: number;
};

/**
 * Fetches benchmark comparisons for a business based on its industry
 * category and size tier. Returns an empty array if the business has no
 * industry category or if the comparison group has fewer than 10 businesses.
 */
export async function getBenchmarkComparisons(
  businessId: string,
  businessMetrics: BusinessBenchmarkMetrics,
  sizeTier: "small" | "medium" | "large",
): Promise<BenchmarkComparison[]> {
  // Get the business's industry category
  const [business] = await db
    .select({ industryCategory: businesses.industryCategory })
    .from(businesses)
    .where(eq(businesses.id, businessId));

  if (!business?.industryCategory) {
    return [];
  }

  // Fetch benchmarks for this group
  const benchmarks = await db
    .select()
    .from(analyticsBenchmarks)
    .where(
      and(
        eq(analyticsBenchmarks.industryCategory, business.industryCategory),
        eq(analyticsBenchmarks.sizeTier, sizeTier),
      ),
    );

  if (benchmarks.length === 0) {
    return [];
  }

  const comparisons: BenchmarkComparison[] = [];

  for (const benchmark of benchmarks) {
    const businessValue = getBusinessValueForMetric(
      benchmark.metricKey,
      businessMetrics,
    );

    if (businessValue === null) continue;

    const comparison = buildBenchmarkComparison(
      benchmark.metricKey,
      businessValue,
      benchmark.medianValue,
      benchmark.businessCount,
    );

    if (comparison) {
      comparisons.push(comparison);
    }
  }

  return comparisons;
}

function getBusinessValueForMetric(
  metricKey: string,
  metrics: BusinessBenchmarkMetrics,
): number | null {
  switch (metricKey) {
    case "formConversionRate":
      return metrics.formConversionRate ?? null;
    case "quoteAcceptanceRate":
      return metrics.quoteAcceptanceRate ?? null;
    case "avgResponseHours":
      return metrics.avgResponseHours ?? null;
    default:
      return null;
  }
}
