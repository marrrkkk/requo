import { describe, expect, it } from "vitest";

import {
  importerCommitKnowledgeSchema,
  importerCommitPricingSchema,
} from "@/features/importer/schemas";
import {
  importerMaxKnowledgeItems,
  importerMaxPricingEntries,
  importerMaxPricingItemsPerEntry,
} from "@/features/importer/types";

describe("importerCommitKnowledgeSchema", () => {
  it("accepts a valid knowledge payload", () => {
    const result = importerCommitKnowledgeSchema.safeParse({
      sourceName: "policies.pdf",
      items: [
        { title: "Refund policy", content: "We refund within 14 days." },
        { title: "Cancellation", content: "Cancel 48h before." },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = importerCommitKnowledgeSchema.safeParse({
      sourceName: "policies.pdf",
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects items missing required fields", () => {
    const result = importerCommitKnowledgeSchema.safeParse({
      sourceName: "policies.pdf",
      items: [{ title: "", content: "body" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects more items than the per-import cap", () => {
    const items = Array.from({ length: importerMaxKnowledgeItems + 1 }).map(
      (_, index) => ({
        title: `Item ${index}`,
        content: "content",
      }),
    );

    const result = importerCommitKnowledgeSchema.safeParse({
      sourceName: "big.pdf",
      items,
    });

    expect(result.success).toBe(false);
  });
});

describe("importerCommitPricingSchema", () => {
  it("accepts a valid pricing payload", () => {
    const result = importerCommitPricingSchema.safeParse({
      sourceName: "prices.csv",
      entries: [
        {
          kind: "block",
          name: "Hourly rate",
          description: "Standard weekday rate",
          items: [
            { description: "Consulting hour", quantity: 1, unitPriceInCents: 15000 },
          ],
        },
        {
          kind: "package",
          name: "Starter bundle",
          items: [
            { description: "Setup", quantity: 1, unitPriceInCents: 50000 },
            { description: "Training hour", quantity: 2, unitPriceInCents: 10000 },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects block entries with multiple line items", () => {
    const result = importerCommitPricingSchema.safeParse({
      sourceName: "prices.csv",
      entries: [
        {
          kind: "block",
          name: "Two items",
          items: [
            { description: "A", quantity: 1, unitPriceInCents: 100 },
            { description: "B", quantity: 1, unitPriceInCents: 200 },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative prices", () => {
    const result = importerCommitPricingSchema.safeParse({
      sourceName: "prices.csv",
      entries: [
        {
          kind: "block",
          name: "Negative",
          items: [{ description: "A", quantity: 1, unitPriceInCents: -100 }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-integer quantities", () => {
    const result = importerCommitPricingSchema.safeParse({
      sourceName: "prices.csv",
      entries: [
        {
          kind: "block",
          name: "Fractional qty",
          items: [{ description: "A", quantity: 1.5, unitPriceInCents: 100 }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects more entries than the per-import cap", () => {
    const entries = Array.from({ length: importerMaxPricingEntries + 1 }).map(
      (_, index) => ({
        kind: "block" as const,
        name: `Entry ${index}`,
        items: [{ description: "x", quantity: 1, unitPriceInCents: 100 }],
      }),
    );

    const result = importerCommitPricingSchema.safeParse({
      sourceName: "big.pdf",
      entries,
    });

    expect(result.success).toBe(false);
  });

  it("rejects packages with more line items than the cap", () => {
    const items = Array.from({
      length: importerMaxPricingItemsPerEntry + 1,
    }).map((_, index) => ({
      description: `Line ${index}`,
      quantity: 1,
      unitPriceInCents: 100,
    }));

    const result = importerCommitPricingSchema.safeParse({
      sourceName: "big.pdf",
      entries: [
        {
          kind: "package",
          name: "Too big",
          items,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
