import { describe, expect, it } from "vitest";

import { parseOnboardingServices } from "@/features/onboarding/schemas";

function makeFormDataValue(services: unknown): FormDataEntryValue {
  return typeof services === "string"
    ? services
    : JSON.stringify(services);
}

describe("parseOnboardingServices", () => {
  it("returns a single blank fallback entry for missing or empty input", () => {
    expect(parseOnboardingServices(null)).toEqual([{ name: "" }]);
    expect(parseOnboardingServices("")).toEqual([{ name: "" }]);
    expect(parseOnboardingServices("   ")).toEqual([{ name: "" }]);
  });

  it("returns the fallback for malformed JSON", () => {
    expect(parseOnboardingServices("not-json")).toEqual([{ name: "" }]);
  });

  it("returns the fallback for a non-array payload", () => {
    expect(parseOnboardingServices(makeFormDataValue({ name: "X" }))).toEqual([
      { name: "" },
    ]);
  });

  it("keeps valid rows, trims whitespace, and drops blanks and short names", () => {
    const result = parseOnboardingServices(
      makeFormDataValue([
        { name: "  Deep cleaning  " },
        { name: "   " },
        { name: "A" },
        { name: "Move-out cleaning" },
      ]),
    );

    expect(result).toEqual([
      { name: "Deep cleaning" },
      { name: "Move-out cleaning" },
    ]);
  });

  it("drops malformed entries instead of failing the whole submission", () => {
    const result = parseOnboardingServices(
      makeFormDataValue([{ name: "Deep cleaning" }, 42, null, "nope"]),
    );

    expect(result).toEqual([{ name: "Deep cleaning" }]);
  });

  it("caps the parsed list at 10 entries", () => {
    const eleven = Array.from({ length: 11 }, (_, index) => ({
      name: `Service ${index + 1}`,
    }));

    expect(parseOnboardingServices(makeFormDataValue(eleven))).toHaveLength(10);
  });

  it("enforces the 80-character name limit", () => {
    const longName = "S".repeat(81);

    expect(parseOnboardingServices(makeFormDataValue([{ name: longName }]))).toEqual([
      { name: "" },
    ]);
    expect(
      parseOnboardingServices(makeFormDataValue([{ name: "S".repeat(80) }])),
    ).toEqual([{ name: "S".repeat(80) }]);
  });

  it("returns the fallback when every entry is dropped", () => {
    expect(parseOnboardingServices(makeFormDataValue([{ name: "" }]))).toEqual([
      { name: "" },
    ]);
  });
});
