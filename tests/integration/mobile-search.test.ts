import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import {
  normalizeMobileSearchQuery,
  searchMobileRecordsForBusiness,
} from "@/features/search/queries";
import { closeTestDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_mobile_search";
let ids: WorkflowFixtureIds;

describe("mobile global search", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("rejects queries that are too short or too long", () => {
    expect(normalizeMobileSearchQuery("")).toBeNull();
    expect(normalizeMobileSearchQuery("a")).toBeNull();
    expect(normalizeMobileSearchQuery("  ")).toBeNull();
    expect(normalizeMobileSearchQuery("x".repeat(81))).toBeNull();
    expect(normalizeMobileSearchQuery(42)).toBeNull();
    expect(normalizeMobileSearchQuery("  taylor  ")).toBe("taylor");
  });

  it("finds inquiries in the requested business", async () => {
    const results = await searchMobileRecordsForBusiness({
      businessId: ids.businessId,
      businessSlug: ids.businessSlug,
      query: "taylor",
    });

    const inquiries = results.filter((result) => result.type === "inquiry");
    expect(inquiries.map((result) => result.id)).toContain(ids.inquiryId);
    for (const result of inquiries) {
      expect(result.href).toContain(ids.businessSlug);
    }
  });

  it("never leaks records from another business", async () => {
    const results = await searchMobileRecordsForBusiness({
      businessId: ids.businessId,
      businessSlug: ids.businessSlug,
      query: "other customer",
    });

    expect(results.map((result) => result.id)).not.toContain(
      ids.otherInquiryId,
    );
  });

  it("returns no results for blank queries without querying", async () => {
    await expect(
      searchMobileRecordsForBusiness({
        businessId: ids.businessId,
        businessSlug: ids.businessSlug,
        query: "x",
      }),
    ).resolves.toEqual([]);
  });
});
