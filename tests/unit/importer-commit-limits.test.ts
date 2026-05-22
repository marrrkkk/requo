/**
 * Unit tests verifying that the importer commit actions reject payloads
 * that would exceed plan limits. These mock the business access layer
 * and DB helpers to test the limit logic in isolation.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const getOperationalBusinessActionContextMock = vi.fn();
const getMemoryCountForBusinessMock = vi.fn();
const createMemoryForBusinessMock = vi.fn();
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

vi.mock("@/features/memory/mutations", () => ({
  getMemoryCountForBusiness: (...args: unknown[]) =>
    getMemoryCountForBusinessMock(...args),
  createMemoryForBusiness: (...args: unknown[]) =>
    createMemoryForBusinessMock(...args),
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
  getBusinessMemoryCacheTags: () => ["mem-tag"],
  getBusinessPricingCacheTags: () => ["pricing-tag"],
  uniqueCacheTags: (tags: string[]) => tags,
}));

vi.mock("@/lib/public-action-rate-limit", () => ({
  assertPublicActionRateLimit: vi.fn(async () => true),
}));

// Import after mocking
import {
  commitKnowledgeImportAction,
  commitPricingImportAction,
} from "@/features/importer/actions";

const businessContext = {
  business: {
    id: "biz_test",
    plan: "pro" as const,
    defaultCurrency: "USD",
  },
};

describe("commitKnowledgeImportAction — plan limit enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOperationalBusinessActionContextMock.mockResolvedValue({
      ok: true,
      user: { id: "user_1" },
      businessContext,
    });
  });

  it("rejects when importing would exceed the plan limit", async () => {
    // Pro plan: memoriesPerBusiness = 10. User already has 8.
    getMemoryCountForBusinessMock.mockResolvedValue(8);

    const result = await commitKnowledgeImportAction({
      sourceName: "test.pdf",
      items: [
        { title: "Item 1", content: "Content 1" },
        { title: "Item 2", content: "Content 2" },
        { title: "Item 3", content: "Content 3" },
      ],
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(3);
    expect(result.error).toContain("over your plan limit");
    expect(result.error).toContain("10");
    expect(createMemoryForBusinessMock).not.toHaveBeenCalled();
  });

  it("allows import when within the plan limit", async () => {
    getMemoryCountForBusinessMock.mockResolvedValue(8);
    createMemoryForBusinessMock.mockResolvedValue({ id: "mem_1" });

    const result = await commitKnowledgeImportAction({
      sourceName: "test.pdf",
      items: [
        { title: "Item 1", content: "Content 1" },
        { title: "Item 2", content: "Content 2" },
      ],
    });

    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.error).toBeUndefined();
    expect(createMemoryForBusinessMock).toHaveBeenCalledTimes(2);
  });

  it("rejects when exactly at the limit (no room for even 1 item)", async () => {
    getMemoryCountForBusinessMock.mockResolvedValue(10);

    const result = await commitKnowledgeImportAction({
      sourceName: "test.pdf",
      items: [{ title: "Item 1", content: "Content 1" }],
    });

    expect(result.created).toBe(0);
    expect(result.error).toContain("over your plan limit");
  });
});

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
    // Pro plan: pricingEntriesPerBusiness = 20. User already has 19.
    getQuoteLibrarySummaryForBusinessMock.mockResolvedValue({
      entryCount: 19,
      blockCount: 10,
      packageCount: 9,
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
    expect(result.error).toContain("over your plan limit");
    expect(result.error).toContain("20");
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
