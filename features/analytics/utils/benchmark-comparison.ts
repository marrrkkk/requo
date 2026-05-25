/**
 * Benchmark comparison utilities.
 *
 * Compares a business's metric value against its benchmark group median.
 * Only produces results when the comparison group has ≥ 10 businesses.
 */

export type BenchmarkPosition = "above" | "average" | "below";

export type BenchmarkComparison = {
  metricKey: string;
  businessValue: number;
  medianValue: number;
  businessCount: number;
  position: BenchmarkPosition;
};

/**
 * Classifies a business's metric relative to the group median.
 *
 * - "above" when businessValue > median × 1.1
 * - "below" when businessValue < median × 0.9
 * - "average" otherwise
 */
export function classifyBenchmarkPosition(
  businessValue: number,
  medianValue: number,
): BenchmarkPosition {
  if (medianValue === 0) {
    // When median is zero, any positive value is above average
    if (businessValue > 0) return "above";
    return "average";
  }

  if (businessValue > medianValue * 1.1) return "above";
  if (businessValue < medianValue * 0.9) return "below";
  return "average";
}

/**
 * Determines if a benchmark group is large enough to display.
 * Requires ≥ 10 businesses to preserve anonymity.
 */
export function isBenchmarkGroupDisplayable(businessCount: number): boolean {
  return businessCount >= 10;
}

/**
 * Builds a BenchmarkComparison from raw data, returning null if the group
 * is too small to display.
 */
export function buildBenchmarkComparison(
  metricKey: string,
  businessValue: number,
  medianValue: number,
  businessCount: number,
): BenchmarkComparison | null {
  if (!isBenchmarkGroupDisplayable(businessCount)) {
    return null;
  }

  return {
    metricKey,
    businessValue,
    medianValue,
    businessCount,
    position: classifyBenchmarkPosition(businessValue, medianValue),
  };
}
