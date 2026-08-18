/**
 * Unit tests verifying that the importer commit actions reject payloads
 * that would exceed plan limits. These mock the business access layer
 * and DB helpers to test the limit logic in isolation.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const getOperationalBusinessActionContextMock = vi.fn();
const getQuoteLibrarySummaryForBusinessMock = vi.fn();
const createQuoteLibraryEntryForBusinessMock = vi.fn();
const updateTagMock = vi.fn();

vi.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => updateTagMock(...args),
}));

vi.mock("@/lib/db/business-access", () => ({
  getOperationalBusinessActionContext: () =>
    getOperationalBusinessActionContextMock(),
}));

vi.mock("@/features/quotes/quote-library-queries", () => ({
  getQuoteLibrarySummaryForBusiness: (...args: unknown[]) =>
    getQuoteLibrarySummaryForBusinessMock(...args),
}));

vi.mock("@/features/quotes/quote-library-mutations", () => ({
  createQuoteLibraryEntryForBusiness: (...args: unknown[]) =>
    createQuoteLibraryEntryForBusinessMock(...args),
}));

vi.mock("@/lib/cache/business-tags", () => ({
  getBusinessPricingCacheTags: () => ["pricing-tag"],
  uniqueCacheTags: (tags: string[]) => tags,
}));

vi.mock("@/lib/rate-limit/redis-rate-limiter", () => ({
  assertPublicActionRateLimit: vi.fn(async () => true),
}));

// Import after mocking
import { commitPricingImportAction } from "@/features/importer/actions";

const businessContext = {
  business: {
    id: "biz_test",
    plan: "pro" as const,
    defaultCurrency: "USD",
  },
};

describe("commitPricingImportAction — plan limit enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOperationalBusinessActionContextMock.mockResolvedValue({
      ok: true,
      user: { id: "user_1" },
      businessContext,
    });
  });

  it("rejects when importing would exceed the plan limit", async () => {
    // Pro plan: pricingEntriesPerBusiness = 50. User already has 49.
    getQuoteLibrarySummaryForBusinessMock.mockResolvedValue({
      entryCount: 49,
      blockCount: 25,
      packageCount: 24,
    });

    const result = await commitPricingImportAction({
      sourceName: "prices.csv",
      entries: [
        {
          kind: "block",
          name: "Entry 1",
          items: [{ description: "Line 1", quantity: 1, unitPriceInCents: 1000 }],
        },
        {
          kind: "block",
          name: "Entry 2",
          items: [{ description: "Line 2", quantity: 1, unitPriceInCents: 2000 }],
        },
      ],
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(2);
    expect(result.error).toContain("This plan supports");
    expect(result.error).toContain("50");
    expect(createQuoteLibraryEntryForBusinessMock).not.toHaveBeenCalled();
  });

  it("allows import when within the plan limit", async () => {
    getQuoteLibrarySummaryForBusinessMock.mockResolvedValue({
      entryCount: 8,
      blockCount: 4,
      packageCount: 4,
    });
    createQuoteLibraryEntryForBusinessMock.mockResolvedValue({ id: "qlib_1" });

    const result = await commitPricingImportAction({
      sourceName: "prices.csv",
      entries: [
        {
          kind: "block",
          name: "Entry 1",
          items: [{ description: "Line 1", quantity: 1, unitPriceInCents: 1000 }],
        },
      ],
    });

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.error).toBeUndefined();
  });
});