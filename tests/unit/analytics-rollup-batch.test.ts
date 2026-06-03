import { describe, expect, it } from "vitest";

import { normalizeBatchSize } from "@/features/analytics/jobs/rollup";

describe("features/analytics/jobs/rollup - batch processing", () => {
  describe("normalizeBatchSize", () => {
    it("returns the default when given 10", () => {
      expect(normalizeBatchSize(10)).toBe(10);
    });

    it("clamps to minimum of 5 when given a value below 5", () => {
      expect(normalizeBatchSize(1)).toBe(5);
      expect(normalizeBatchSize(0)).toBe(5);
      expect(normalizeBatchSize(-10)).toBe(5);
      expect(normalizeBatchSize(4)).toBe(5);
    });

    it("clamps to maximum of 25 when given a value above 25", () => {
      expect(normalizeBatchSize(26)).toBe(25);
      expect(normalizeBatchSize(100)).toBe(25);
      expect(normalizeBatchSize(50)).toBe(25);
    });

    it("accepts values within valid range [5, 25]", () => {
      expect(normalizeBatchSize(5)).toBe(5);
      expect(normalizeBatchSize(15)).toBe(15);
      expect(normalizeBatchSize(25)).toBe(25);
    });

    it("rounds fractional values to nearest integer", () => {
      expect(normalizeBatchSize(10.7)).toBe(11);
      expect(normalizeBatchSize(5.4)).toBe(5);
      expect(normalizeBatchSize(24.6)).toBe(25);
    });
  });
});
