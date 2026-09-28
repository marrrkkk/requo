import { describe, expect, it } from "vitest";

import {
  isScopeBlockContentComplete,
  scopeBlockContentSchemas,
  validateScopeBlockContent,
} from "@/features/scope-blocks/schemas";
import { scopeBlockKinds } from "@/lib/db/schema/scope-blocks";

describe("scope block schemas", () => {
  it("covers all ten kinds", () => {
    expect(scopeBlockKinds).toHaveLength(10);
    expect(Object.keys(scopeBlockContentSchemas)).toHaveLength(10);
  });

  it("validates typed content per kind", () => {
    expect(() =>
      validateScopeBlockContent("deliverables", { items: [{ label: "Photos" }] }),
    ).not.toThrow();

    expect(() =>
      validateScopeBlockContent("allowances", {
        items: [{ label: "Tile", amountCents: 50000, brand: "Acme" }],
      }),
    ).not.toThrow();

    expect(() =>
      validateScopeBlockContent("payment_schedule", { referenceSchedule: true }),
    ).not.toThrow();
  });

  it("rejects unknown keys and wrong shapes", () => {
    expect(() =>
      validateScopeBlockContent("deliverables", { items: [], hack: 1 }),
    ).toThrow();

    expect(() =>
      validateScopeBlockContent("revision_cap", { rounds: -1 }),
    ).toThrow();

    expect(() =>
      validateScopeBlockContent("usage_rights", {
        matrix: [{ media: "web", term: "1y", territory: "US" }],
        carveouts: [],
      }),
    ).not.toThrow();

    expect(() =>
      validateScopeBlockContent("usage_rights", { matrix: [], carveouts: [] }),
    ).not.toThrow();
  });

  it("evaluates completeness structurally", () => {
    expect(isScopeBlockContentComplete("deliverables", { items: [{ label: "x" }] })).toBe(true);
    expect(isScopeBlockContentComplete("deliverables", { items: [] })).toBe(false);
    expect(isScopeBlockContentComplete("revision_cap", { rounds: 2 })).toBe(true);
    expect(isScopeBlockContentComplete("payment_schedule", { referenceSchedule: true })).toBe(true);
    expect(isScopeBlockContentComplete("timeline", { milestones: [] })).toBe(true);
    expect(isScopeBlockContentComplete("deliverables", { nope: true })).toBe(false);
  });
});
