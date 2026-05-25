/**
 * Sparkline data interpolation utility.
 *
 * Given daily metric values within a date range, produces exactly 7 evenly-spaced
 * interval averages for rendering mini sparkline charts on metric cards.
 *
 * @module features/analytics/utils/sparkline-interpolation
 */

export type SparklineData = number[]; // Always exactly 7 points

export type DailyMetricValue = {
  date: string; // ISO date string (YYYY-MM-DD)
  value: number;
};

/**
 * Produces exactly 7 numeric points representing evenly-spaced intervals across
 * the given date range. Each point is the average of daily values falling within
 * that interval.
 *
 * When fewer than 7 data points exist, available values are distributed across
 * the 7-point grid based on their temporal position. Intervals with no data
 * points are filled by linear interpolation between neighboring intervals that
 * have data.
 *
 * @param dailyValues - Array of daily metric values with ISO date strings
 * @param since - Start of the date range (inclusive)
 * @param until - End of the date range (inclusive)
 * @returns Exactly 7 numeric points representing the sparkline
 */
export function interpolateSparklineData(
  dailyValues: DailyMetricValue[],
  since: Date,
  until: Date,
): SparklineData {
  const POINT_COUNT = 7;

  // Handle empty input — return 7 zeros
  if (dailyValues.length === 0) {
    return Array(POINT_COUNT).fill(0) as SparklineData;
  }

  const sinceMs = since.getTime();
  const untilMs = until.getTime();
  const totalRangeMs = untilMs - sinceMs;

  // If since equals until (zero-width range), all points get the average of all values
  if (totalRangeMs <= 0) {
    const avg =
      dailyValues.reduce((sum, v) => sum + v.value, 0) / dailyValues.length;
    return Array(POINT_COUNT).fill(avg) as SparklineData;
  }

  // Divide the range into 7 equal intervals and compute averages per bucket
  const buckets: number[][] = Array.from({ length: POINT_COUNT }, () => []);

  for (const { date, value } of dailyValues) {
    const dateMs = new Date(date).getTime();

    // Clamp to range boundaries
    const clampedMs = Math.max(sinceMs, Math.min(untilMs, dateMs));

    // Determine which bucket this value falls into (0-6)
    const normalized = (clampedMs - sinceMs) / totalRangeMs;
    const bucketIndex = Math.min(
      Math.floor(normalized * POINT_COUNT),
      POINT_COUNT - 1,
    );

    buckets[bucketIndex].push(value);
  }

  // Compute averages for buckets that have data
  const points: (number | null)[] = buckets.map((bucket) =>
    bucket.length > 0
      ? bucket.reduce((sum, v) => sum + v, 0) / bucket.length
      : null,
  );

  // Interpolate gaps using linear interpolation between nearest filled neighbors
  return fillGaps(points) as SparklineData;
}

/**
 * Fills null gaps in an array using linear interpolation between
 * the nearest non-null neighbors. Leading/trailing nulls are filled
 * with the nearest known value.
 */
function fillGaps(points: (number | null)[]): number[] {
  const result: number[] = new Array(points.length);

  // Find indices of non-null values
  const knownIndices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i] !== null) {
      knownIndices.push(i);
    }
  }

  // If no known values (shouldn't happen given we check for empty input above)
  if (knownIndices.length === 0) {
    return Array(points.length).fill(0);
  }

  // If only one known value, fill all with that value
  if (knownIndices.length === 1) {
    return Array(points.length).fill(points[knownIndices[0]]);
  }

  for (let i = 0; i < points.length; i++) {
    if (points[i] !== null) {
      result[i] = points[i]!;
    } else {
      // Find previous and next known values
      const prevIdx = findPrevKnown(knownIndices, i);
      const nextIdx = findNextKnown(knownIndices, i);

      if (prevIdx === null) {
        // Before first known value — use first known
        result[i] = points[knownIndices[0]]!;
      } else if (nextIdx === null) {
        // After last known value — use last known
        result[i] = points[knownIndices[knownIndices.length - 1]]!;
      } else {
        // Linearly interpolate between prev and next
        const prevVal = points[prevIdx]!;
        const nextVal = points[nextIdx]!;
        const t = (i - prevIdx) / (nextIdx - prevIdx);
        result[i] = prevVal + t * (nextVal - prevVal);
      }
    }
  }

  return result;
}

function findPrevKnown(knownIndices: number[], i: number): number | null {
  for (let k = knownIndices.length - 1; k >= 0; k--) {
    if (knownIndices[k] < i) return knownIndices[k];
  }
  return null;
}

function findNextKnown(knownIndices: number[], i: number): number | null {
  for (let k = 0; k < knownIndices.length; k++) {
    if (knownIndices[k] > i) return knownIndices[k];
  }
  return null;
}
