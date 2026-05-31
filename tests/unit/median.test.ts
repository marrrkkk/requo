import { describe, expect, it } from "vitest";

import { computeMedian } from "@/features/analytics/utils/median";

describe("features/analytics/utils/median", () => {
  it("returns null when fewer than 3 data points (default threshold)", () => {
    expect(computeMedian([])).toBeNull();
    expect(computeMedian([5])).toBeNull();
    expect(computeMedian([3, 7])).toBeNull();
  });

  it("computes the median of an odd-length array", () => {
    expect(computeMedian([1, 3, 5])).toBe(3);
    expect(computeMedian([10, 2, 7, 1, 9])).toBe(7);
  });

  it("computes the median of an even-length array as average of two middle values", () => {
    expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
    expect(computeMedian([10, 20, 30, 40])).toBe(25);
  });

  it("does not mutate the input array", () => {
    const input = [9, 1, 5];
    computeMedian(input);
    expect(input).toEqual([9, 1, 5]);
  });

  it("handles a single repeated value", () => {
    expect(computeMedian([4, 4, 4, 4])).toBe(4);
  });

  it("respects a custom minDataPoints threshold", () => {
    expect(computeMedian([5, 10], 2)).toBe(7.5);
    expect(computeMedian([5], 2)).toBeNull();
    expect(computeMedian([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(computeMedian([1, 2, 3, 4], 5)).toBeNull();
  });

  it("handles negative and decimal values", () => {
    expect(computeMedian([-3, -1, 0, 2, 5])).toBe(0);
    expect(computeMedian([0.5, 1.5, 2.5])).toBe(1.5);
  });
});
