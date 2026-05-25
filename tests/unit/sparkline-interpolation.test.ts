import { describe, it, expect } from "vitest";

import {
  interpolateSparklineData,
  type DailyMetricValue,
} from "@/features/analytics/utils/sparkline-interpolation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDailyValues(
  values: number[],
  startDate: Date,
): DailyMetricValue[] {
  return values.map((value, i) => {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + i);
    return { date: date.toISOString().split("T")[0], value };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("interpolateSparklineData", () => {
  it("always returns exactly 7 points", () => {
    const since = new Date("2024-01-01");
    const until = new Date("2024-01-31");
    const values = makeDailyValues([1, 2, 3], since);

    const result = interpolateSparklineData(values, since, until);

    expect(result).toHaveLength(7);
  });

  it("returns 7 zeros for empty input", () => {
    const since = new Date("2024-01-01");
    const until = new Date("2024-01-31");

    const result = interpolateSparklineData([], since, until);

    expect(result).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("distributes 7 daily values into 7 buckets for a 7-day range", () => {
    const since = new Date("2024-01-01");
    const until = new Date("2024-01-07");
    const values = makeDailyValues([10, 20, 30, 40, 50, 60, 70], since);

    const result = interpolateSparklineData(values, since, until);

    expect(result).toHaveLength(7);
    // Each day maps to one bucket
    result.forEach((point) => {
      expect(point).toBeGreaterThanOrEqual(10);
      expect(point).toBeLessThanOrEqual(70);
    });
  });

  it("averages values within the same interval", () => {
    const since = new Date("2024-01-01");
    const until = new Date("2024-01-07");
    // Two values on the same first day
    const values: DailyMetricValue[] = [
      { date: "2024-01-01", value: 10 },
      { date: "2024-01-01", value: 20 },
    ];

    const result = interpolateSparklineData(values, since, until);

    // First bucket should have average of 10 and 20
    expect(result[0]).toBe(15);
  });

  it("handles a single data point by filling all points with that value", () => {
    const since = new Date("2024-01-01");
    const until = new Date("2024-01-31");
    const values: DailyMetricValue[] = [{ date: "2024-01-15", value: 42 }];

    const result = interpolateSparklineData(values, since, until);

    expect(result).toHaveLength(7);
    // All points should be 42 (only one known value, interpolation fills with it)
    result.forEach((point) => {
      expect(point).toBe(42);
    });
  });

  it("handles a zero-width date range by averaging all values", () => {
    const date = new Date("2024-01-15");
    const values: DailyMetricValue[] = [
      { date: "2024-01-15", value: 10 },
      { date: "2024-01-15", value: 30 },
    ];

    const result = interpolateSparklineData(values, date, date);

    expect(result).toHaveLength(7);
    result.forEach((point) => {
      expect(point).toBe(20);
    });
  });

  it("linearly interpolates gaps between known intervals", () => {
    const since = new Date("2024-01-01");
    const until = new Date("2024-01-28");
    // Values at start and end of range only
    const values: DailyMetricValue[] = [
      { date: "2024-01-01", value: 0 },
      { date: "2024-01-28", value: 60 },
    ];

    const result = interpolateSparklineData(values, since, until);

    expect(result).toHaveLength(7);
    // Should be linearly increasing from 0 to 60
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
    }
  });

  it("clamps values outside the date range to boundaries", () => {
    const since = new Date("2024-01-10");
    const until = new Date("2024-01-20");
    // Value before range start
    const values: DailyMetricValue[] = [
      { date: "2024-01-05", value: 100 },
      { date: "2024-01-15", value: 50 },
    ];

    const result = interpolateSparklineData(values, since, until);

    expect(result).toHaveLength(7);
    // Out-of-range value should be clamped to first bucket
    expect(result[0]).toBe(100);
  });

  it("produces numeric (non-NaN) values for all points", () => {
    const since = new Date("2024-01-01");
    const until = new Date("2024-03-31");
    const values = makeDailyValues(
      Array.from({ length: 90 }, (_, i) => i + 1),
      since,
    );

    const result = interpolateSparklineData(values, since, until);

    expect(result).toHaveLength(7);
    result.forEach((point) => {
      expect(Number.isNaN(point)).toBe(false);
      expect(Number.isFinite(point)).toBe(true);
    });
  });
});
