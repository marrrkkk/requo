import { describe, expect, it } from "vitest";

import {
  statusToneClassNames,
  statusTones,
  tokenBackedStatusTones,
} from "@/components/shared/status-badge";

/** Any raw Tailwind palette utility — banned outside the tone map. */
const RAW_PALETTE =
  /\b(?:bg|text|border|ring)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d/;

describe("status tone vocabulary", () => {
  it("exposes nine unique tones", () => {
    expect(statusTones).toHaveLength(9);
    expect(new Set(statusTones).size).toBe(9);
  });

  it("maps every tone to a non-empty class string", () => {
    for (const tone of statusTones) {
      expect(statusToneClassNames[tone].trim().length).toBeGreaterThan(0);
    }
  });

  it("backs the semantic tones with tokens rather than raw palette", () => {
    for (const tone of tokenBackedStatusTones) {
      expect(statusToneClassNames[tone]).not.toMatch(RAW_PALETTE);
    }
  });

  it("gives each decorative hue a full dark-mode pair", () => {
    const decorative = statusTones.filter(
      (tone) => !tokenBackedStatusTones.includes(tone),
    );

    expect(decorative).toHaveLength(4);

    for (const tone of decorative) {
      const classes = statusToneClassNames[tone];
      expect(classes).toMatch(/\bdark:border-/);
      expect(classes).toMatch(/\bdark:bg-/);
      expect(classes).toMatch(/\bdark:text-/);
    }
  });

  it("needs no dark-mode pair for token-backed tones", () => {
    for (const tone of tokenBackedStatusTones) {
      expect(statusToneClassNames[tone]).not.toMatch(/\bdark:/);
    }
  });

  it("carries no !important override anywhere", () => {
    for (const tone of statusTones) {
      expect(statusToneClassNames[tone]).not.toContain("!");
    }
  });
});
