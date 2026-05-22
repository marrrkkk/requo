import { describe, it, expect, vi, beforeEach } from "vitest";

import type { DashboardQuoteLibraryEntry } from "@/features/quotes/types";

// Mock the server-only quote library query
const getQuoteLibraryForBusinessMock = vi.fn<
  (businessId: string) => Promise<DashboardQuoteLibraryEntry[]>
>();

vi.mock("@/features/quotes/quote-library-queries", () => ({
  getQuoteLibraryForBusiness: (...args: unknown[]) =>
    getQuoteLibraryForBusinessMock(...(args as [string])),
}));

import {
  retrieveRelevantPricing,
  tokenize,
  stem,
  jaccardSimilarity,
  scoreEntry,
} from "@/features/ai/pricing-retriever";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<DashboardQuoteLibraryEntry> & { id: string },
): DashboardQuoteLibraryEntry {
  return {
    currency: "USD",
    kind: "block",
    name: "Test Entry",
    description: null,
    itemCount: 1,
    totalInCents: 10000,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: "item_1",
        description: "Default item",
        quantity: 1,
        unitPriceInCents: 10000,
        position: 0,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  getQuoteLibraryForBusinessMock.mockReset();
});

// ---------------------------------------------------------------------------
// stem
// ---------------------------------------------------------------------------

describe("stem", () => {
  it("lowercases input", () => {
    expect(stem("HELLO")).toBe("hello");
  });

  it("removes -ing suffix", () => {
    expect(stem("painting")).toBe("paint");
  });

  it("removes -ed suffix", () => {
    expect(stem("painted")).toBe("paint");
  });

  it("removes -s suffix", () => {
    expect(stem("paints")).toBe("paint");
  });

  it("removes -ly suffix", () => {
    expect(stem("quickly")).toBe("quick");
  });

  it("does not strip short words below 4 chars", () => {
    expect(stem("the")).toBe("the");
    expect(stem("is")).toBe("is");
  });
});

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------

describe("tokenize", () => {
  it("splits on non-alphanumeric characters", () => {
    const tokens = tokenize("hello world! foo-bar");
    expect(tokens.has(stem("hello"))).toBe(true);
    expect(tokens.has(stem("world"))).toBe(true);
    expect(tokens.has(stem("foo"))).toBe(true);
    expect(tokens.has(stem("bar"))).toBe(true);
  });

  it("deduplicates tokens", () => {
    const tokens = tokenize("paint painting paints");
    // All stem to "paint"
    expect(tokens.size).toBe(1);
  });

  it("returns empty set for empty string", () => {
    expect(tokenize("").size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// jaccardSimilarity
// ---------------------------------------------------------------------------

describe("jaccardSimilarity", () => {
  it("returns 1 for identical sets", () => {
    const set = new Set(["a", "b", "c"]);
    expect(jaccardSimilarity(set, set)).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    const setA = new Set(["a", "b"]);
    const setB = new Set(["c", "d"]);
    expect(jaccardSimilarity(setA, setB)).toBe(0);
  });

  it("returns correct value for partial overlap", () => {
    const setA = new Set(["a", "b", "c"]);
    const setB = new Set(["b", "c", "d"]);
    // intersection = {b, c} = 2, union = {a, b, c, d} = 4
    expect(jaccardSimilarity(setA, setB)).toBeCloseTo(0.5);
  });

  it("returns 0 for two empty sets", () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreEntry
// ---------------------------------------------------------------------------

describe("scoreEntry", () => {
  it("scores higher for entries with matching terms", () => {
    const entry = makeEntry({
      id: "e1",
      name: "Interior Painting Service",
      description: "Professional interior wall painting",
      items: [
        {
          id: "i1",
          description: "Wall painting per room",
          quantity: 1,
          unitPriceInCents: 50000,
          position: 0,
        },
      ],
    });

    // Use text with high token overlap with the entry
    const inquiryTokens = tokenize(
      "interior painting service wall room professional",
    );
    const score = scoreEntry(entry, inquiryTokens);
    expect(score).toBeGreaterThan(0.3);
  });

  it("scores low for unrelated entries", () => {
    const entry = makeEntry({
      id: "e2",
      name: "Plumbing Repair",
      description: "Fix leaky pipes and drains",
      items: [
        {
          id: "i2",
          description: "Pipe replacement",
          quantity: 1,
          unitPriceInCents: 30000,
          position: 0,
        },
      ],
    });

    const inquiryTokens = tokenize("I need a wedding photography package");
    const score = scoreEntry(entry, inquiryTokens);
    expect(score).toBeLessThan(0.3);
  });
});

// ---------------------------------------------------------------------------
// retrieveRelevantPricing — small library bypass
// ---------------------------------------------------------------------------

describe("retrieveRelevantPricing — small library bypass", () => {
  it("returns all entries when fewer than 10 exist in target currency", async () => {
    const entries = [
      makeEntry({ id: "e1", name: "Entry A", currency: "USD" }),
      makeEntry({ id: "e2", name: "Entry B", currency: "USD" }),
    ];
    getQuoteLibraryForBusinessMock.mockResolvedValue(entries);

    const result = await retrieveRelevantPricing({
      inquiryText: "completely unrelated text xyz",
      businessId: "biz_1",
      currency: "USD",
    });

    expect(result.entries).toHaveLength(2);
    expect(result.needsOwnerReview).toBe(false);
  });

  it("returns empty when no entries exist in target currency", async () => {
    const entries = [
      makeEntry({ id: "e1", name: "Entry A", currency: "EUR" }),
    ];
    getQuoteLibraryForBusinessMock.mockResolvedValue(entries);

    const result = await retrieveRelevantPricing({
      inquiryText: "some inquiry",
      businessId: "biz_1",
      currency: "USD",
    });

    expect(result.entries).toHaveLength(0);
    expect(result.needsOwnerReview).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// retrieveRelevantPricing — filtering behavior
// ---------------------------------------------------------------------------

describe("retrieveRelevantPricing — filtering", () => {
  it("returns relevant entries scored above threshold when library has 10+ entries", async () => {
    const entries = [
      makeEntry({
        id: "e1",
        name: "Interior Painting",
        description: "Professional interior painting service",
        currency: "USD",
        items: [
          {
            id: "item_e1",
            description: "Interior painting per room",
            quantity: 1,
            unitPriceInCents: 50000,
            position: 0,
          },
        ],
      }),
      makeEntry({
        id: "e2",
        name: "Exterior Painting",
        description: "Outdoor exterior painting",
        currency: "USD",
        items: [
          {
            id: "item_e2",
            description: "Exterior painting per wall",
            quantity: 1,
            unitPriceInCents: 60000,
            position: 0,
          },
        ],
      }),
      makeEntry({
        id: "e3",
        name: "Plumbing Repair",
        description: "Fix leaky pipes and drains",
        currency: "USD",
      }),
      makeEntry({
        id: "e4",
        name: "Electrical Wiring",
        description: "Install new electrical circuits",
        currency: "USD",
      }),
      ...Array.from({ length: 8 }, (_, i) =>
        makeEntry({
          id: `e${i + 5}`,
          name: `Unrelated Service ${i}`,
          description: `Completely different thing ${i}`,
          currency: "USD",
        }),
      ),
    ];
    getQuoteLibraryForBusinessMock.mockResolvedValue(entries);

    // Use inquiry text with strong overlap with painting entries
    const result = await retrieveRelevantPricing({
      inquiryText: "interior painting service professional room",
      businessId: "biz_1",
      currency: "USD",
    });

    // Should include painting entries
    expect(result.entries.length).toBeGreaterThanOrEqual(1);
    expect(result.entries.length).toBeLessThanOrEqual(7);
    expect(result.needsOwnerReview).toBe(false);

    // Verify returned entries are from the original library (verbatim)
    for (const entry of result.entries) {
      expect(entries.find((e) => e.id === entry.id)).toBeDefined();
    }
  });

  it("returns entries with needsOwnerReview: true when no entries pass threshold", async () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      makeEntry({
        id: `e${i}`,
        name: `Xyzzy${i} Qwerty${i} Asdf${i}`,
        description: `Completely unrelated service ${i}`,
        currency: "USD",
      }),
    );
    getQuoteLibraryForBusinessMock.mockResolvedValue(entries);

    const result = await retrieveRelevantPricing({
      inquiryText: "photography wedding portrait session",
      businessId: "biz_1",
      currency: "USD",
    });

    // Now returns top entries even below threshold (to avoid hallucination)
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.needsOwnerReview).toBe(true);
  });

  it("respects maxResults parameter", async () => {
    // Create many matching entries
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry({
        id: `e${i}`,
        name: `Painting Service ${i}`,
        description: "Professional interior painting",
        currency: "USD",
        items: [
          {
            id: `item_${i}`,
            description: "Interior wall painting",
            quantity: 1,
            unitPriceInCents: 50000,
            position: 0,
          },
        ],
      }),
    );
    getQuoteLibraryForBusinessMock.mockResolvedValue(entries);

    const result = await retrieveRelevantPricing({
      inquiryText: "I need professional interior painting service",
      businessId: "biz_1",
      currency: "USD",
      maxResults: 3,
    });

    expect(result.entries.length).toBeLessThanOrEqual(3);
    expect(result.needsOwnerReview).toBe(false);
  });

  it("returns results sorted by descending similarity score", async () => {
    const entries = [
      ...Array.from({ length: 8 }, (_, i) =>
        makeEntry({
          id: `filler${i}`,
          name: `Unrelated Filler ${i}`,
          description: `Something completely different ${i}`,
          currency: "USD",
        }),
      ),
      makeEntry({
        id: "e1",
        name: "Basic Cleaning",
        description: "Simple house cleaning",
        currency: "USD",
      }),
      makeEntry({
        id: "e2",
        name: "Deep Cleaning Service",
        description: "Professional deep cleaning for homes and offices",
        currency: "USD",
        items: [
          {
            id: "item_2",
            description: "Deep cleaning per room",
            quantity: 1,
            unitPriceInCents: 15000,
            position: 0,
          },
        ],
      }),
      makeEntry({
        id: "e3",
        name: "Window Cleaning",
        description: "Professional window cleaning service",
        currency: "USD",
      }),
    ];
    getQuoteLibraryForBusinessMock.mockResolvedValue(entries);

    const result = await retrieveRelevantPricing({
      inquiryText: "I need deep cleaning for my home",
      businessId: "biz_1",
      currency: "USD",
    });

    // If multiple entries pass, they should be ordered by score
    if (result.entries.length > 1) {
      // The deep cleaning entry should rank higher
      const deepCleaningIndex = result.entries.findIndex(
        (e) => e.id === "e2",
      );
      expect(deepCleaningIndex).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// retrieveRelevantPricing — verbatim entries
// ---------------------------------------------------------------------------

describe("retrieveRelevantPricing — data integrity", () => {
  it("returns verbatim library entries without modification", async () => {
    const originalEntry = makeEntry({
      id: "e1",
      name: "Painting Service",
      description: "Professional painting",
      currency: "USD",
      totalInCents: 75000,
      items: [
        {
          id: "item_1",
          description: "Wall painting",
          quantity: 2,
          unitPriceInCents: 37500,
          position: 0,
        },
      ],
    });
    const entries = [
      originalEntry,
      makeEntry({ id: "e2", name: "Other Service A", currency: "USD" }),
      makeEntry({ id: "e3", name: "Other Service B", currency: "USD" }),
    ];
    getQuoteLibraryForBusinessMock.mockResolvedValue(entries);

    const result = await retrieveRelevantPricing({
      inquiryText: "I need painting service for walls",
      businessId: "biz_1",
      currency: "USD",
    });

    const returnedEntry = result.entries.find((e) => e.id === "e1");
    if (returnedEntry) {
      // Verify the entry is returned verbatim
      expect(returnedEntry).toBe(originalEntry);
    }
  });

  it("only returns entries that exist in the original library", async () => {
    const entries = [
      makeEntry({ id: "e1", name: "Service A", currency: "USD" }),
      makeEntry({ id: "e2", name: "Service B", currency: "USD" }),
      makeEntry({ id: "e3", name: "Service C", currency: "USD" }),
    ];
    getQuoteLibraryForBusinessMock.mockResolvedValue(entries);

    const result = await retrieveRelevantPricing({
      inquiryText: "service",
      businessId: "biz_1",
      currency: "USD",
    });

    const originalIds = new Set(entries.map((e) => e.id));
    for (const entry of result.entries) {
      expect(originalIds.has(entry.id)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// retrieveRelevantPricing — currency filtering
// ---------------------------------------------------------------------------

describe("retrieveRelevantPricing — currency filtering", () => {
  it("only considers entries matching the target currency", async () => {
    const entries = [
      makeEntry({ id: "e1", name: "Painting", currency: "USD" }),
      makeEntry({ id: "e2", name: "Painting", currency: "EUR" }),
      makeEntry({ id: "e3", name: "Painting", currency: "USD" }),
      makeEntry({ id: "e4", name: "Painting", currency: "USD" }),
    ];
    getQuoteLibraryForBusinessMock.mockResolvedValue(entries);

    const result = await retrieveRelevantPricing({
      inquiryText: "painting",
      businessId: "biz_1",
      currency: "EUR",
    });

    // Only 1 EUR entry exists (< 3), so bypass filtering and return all EUR entries
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].currency).toBe("EUR");
  });
});
