import { describe, expect, it } from "vitest";

import {
  defaultUiScale,
  isUiScale,
  resolveUiScale,
  uiScaleLabels,
  uiScaleRootFontSizePercent,
  uiScales,
} from "@/features/theme/ui-scale-types";

describe("features/theme/ui-scale-types", () => {
  it("defines exactly three scales", () => {
    expect(uiScales).toEqual(["small", "default", "large"]);
  });

  it("defaults to the 14px body scale", () => {
    expect(defaultUiScale).toBe("default");
    expect(resolveUiScale(null)).toBe("default");
    expect(resolveUiScale(undefined)).toBe("default");
    expect(resolveUiScale("huge")).toBe("default");
  });

  it("accepts only the three known scales", () => {
    expect(isUiScale("small")).toBe(true);
    expect(isUiScale("default")).toBe(true);
    expect(isUiScale("large")).toBe(true);
    expect(isUiScale("system")).toBe(false);
    expect(isUiScale("")).toBe(false);
  });

  it("resolves a valid stored scale", () => {
    expect(resolveUiScale("small")).toBe("small");
    expect(resolveUiScale("large")).toBe("large");
  });

  it("maps scales to root percentages that hit 13/14/15px bodies", () => {
    // text-sm is 0.875rem; root % * 16px * 0.875 must equal the body target.
    const bodyFor = (scale: "small" | "default" | "large") =>
      (uiScaleRootFontSizePercent[scale] / 100) * 16 * 0.875;

    expect(bodyFor("small")).toBeCloseTo(13, 1);
    expect(bodyFor("default")).toBeCloseTo(14, 1);
    expect(bodyFor("large")).toBeCloseTo(15, 1);
  });

  it("labels every scale", () => {
    for (const scale of uiScales) {
      expect(uiScaleLabels[scale]).toBeTruthy();
    }
    expect(uiScaleLabels.default).toContain("100%");
  });
});
