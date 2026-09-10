import { describe, expect, it } from "vitest";

import {
  formatRelativeDelta,
  formatPointsDelta,
  formatSpeedDelta,
} from "@/features/analytics/utils";

describe("formatRelativeDelta", () => {
  it("formats a relative percentage increase", () => {
    expect(formatRelativeDelta(1200, 1000)).toEqual({
      label: "+20%",
      direction: "up",
    });
  });

  it("formats a relative percentage decrease with a minus sign", () => {
    expect(formatRelativeDelta(800, 1000)).toEqual({
      label: "−20%",
      direction: "down",
    });
  });

  it("reads zero-to-growth as an absolute move when a formatter is given", () => {
    expect(formatRelativeDelta(500, 0, (v) => `$${v}`)).toEqual({
      label: "+$500",
      direction: "up",
    });
  });

  it("reads zero-to-growth as New when no formatter is given", () => {
    expect(formatRelativeDelta(500, 0)).toEqual({
      label: "New",
      direction: "up",
    });
  });

  it("reads growth-to-zero as −100%", () => {
    expect(formatRelativeDelta(0, 500)).toEqual({
      label: "−100%",
      direction: "down",
    });
  });

  it("reads equal values as no change", () => {
    expect(formatRelativeDelta(1000, 1000)).toEqual({
      label: "No change",
      direction: "flat",
    });
  });

  it("reads sub-1% movement as no change", () => {
    expect(formatRelativeDelta(1004, 1000)).toEqual({
      label: "No change",
      direction: "flat",
    });
  });

  it("reads double zero as no change", () => {
    expect(formatRelativeDelta(0, 0)).toEqual({
      label: "No change",
      direction: "flat",
    });
  });
});

describe("formatPointsDelta", () => {
  it("formats a percentage-point increase", () => {
    expect(formatPointsDelta(0.6, 0.5)).toEqual({
      label: "+10 pts",
      direction: "up",
    });
  });

  it("formats a percentage-point decrease", () => {
    expect(formatPointsDelta(0.42, 0.5)).toEqual({
      label: "−8 pts",
      direction: "down",
    });
  });

  it("reads an unchanged rate as no change", () => {
    expect(formatPointsDelta(0.5, 0.5)).toEqual({
      label: "No change",
      direction: "flat",
    });
  });

  it("reads sub-point movement as no change", () => {
    expect(formatPointsDelta(0.504, 0.5)).toEqual({
      label: "No change",
      direction: "flat",
    });
  });
});

describe("formatSpeedDelta", () => {
  it("phrases a decrease as faster", () => {
    expect(formatSpeedDelta(4, 6)).toEqual({
      label: "33% faster",
      direction: "down",
    });
  });

  it("phrases an increase as slower", () => {
    expect(formatSpeedDelta(7.5, 6)).toEqual({
      label: "25% slower",
      direction: "up",
    });
  });

  it("reads an unchanged average as no change", () => {
    expect(formatSpeedDelta(6, 6)).toEqual({
      label: "No change",
      direction: "flat",
    });
  });

  it("reads missing current data as no data yet", () => {
    expect(formatSpeedDelta(null, 6)).toEqual({
      label: "No data yet",
      direction: "flat",
    });
  });

  it("reads a first-ever measurement as no prior data", () => {
    expect(formatSpeedDelta(5, null)).toEqual({
      label: "No prior data",
      direction: "flat",
    });
  });

  it("reads double-null as no data yet", () => {
    expect(formatSpeedDelta(null, null)).toEqual({
      label: "No data yet",
      direction: "flat",
    });
  });

  it("reads sub-1% movement as no change", () => {
    expect(formatSpeedDelta(6.02, 6)).toEqual({
      label: "No change",
      direction: "flat",
    });
  });
});
