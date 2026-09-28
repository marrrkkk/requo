import { describe, expect, it } from "vitest";

import { behaviorPackKeys } from "@/features/businesses/behavior-packs";
import { packRecipeDefaults } from "@/features/businesses/pack-recipe-defaults";
import { validateRecipeConfig } from "@/features/businesses/pack-recipes";

describe("pack recipes", () => {
  it("seeds defaults for every pack and kind", () => {
    for (const pack of behaviorPackKeys) {
      const defaults = packRecipeDefaults[pack];

      for (const kind of ["intake", "scope", "approval", "schedule", "ai_guidance"] as const) {
        expect(() => validateRecipeConfig(kind, defaults[kind])).not.toThrow();
      }
    }
  });

  it("rejects unknown binding kinds fail-closed", () => {
    expect(() =>
      validateRecipeConfig("intake", {
        version: 1,
        criticalFields: [
          { label: "X", criticality: "critical", behaviors: ["teleport"] },
        ],
      }),
    ).toThrow();
  });

  it("rejects executable content in config", () => {
    expect(() =>
      validateRecipeConfig("scope", {
        version: 1,
        requiredKinds: ["deliverables'); DROP TABLE quotes; --"],
        recommendedKinds: [],
      }),
    ).toThrow();

    expect(() =>
      validateRecipeConfig("ai_guidance", {
        version: 1,
        terminology: ["function() { steal(); }"],
        scopeRules: [],
        completeness: [],
        packageConcepts: [],
        missingInfoGuidance: [],
        criticalLabels: [],
      }),
    ).toThrow();
  });

  it("rejects unknown keys and wrong shapes", () => {
    expect(() =>
      validateRecipeConfig("intake", { version: 1, criticalFields: [], extra: true }),
    ).toThrow();

    expect(() =>
      validateRecipeConfig("schedule", { version: 2, structures: [] }),
    ).toThrow();
  });

  it("keeps milestone approvals disabled until schedules land", () => {
    for (const pack of behaviorPackKeys) {
      const recipes = packRecipeDefaults[pack].approval.recipes as Record<string, { enabled: boolean }>;
      expect(recipes["milestone"]?.enabled).toBe(false);
      expect(recipes["proof"]?.enabled).toBe(true);
    }
  });
});
