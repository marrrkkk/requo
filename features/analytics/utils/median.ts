/**
 * Computes the statistical median of an array of numbers.
 *
 * Returns null when the array has fewer than `minDataPoints` elements
 * (defaults to 3, matching the pipeline velocity threshold).
 */
export function computeMedian(
  values: number[],
  minDataPoints = 3,
): number | null {
  if (values.length < minDataPoints) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }

  return sorted[mid]!;
}
