import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {},
}));

import { createBusinessScopedVisitorHash } from "@/features/analytics/tracking";

function createHeaderStore(headers: Record<string, string | undefined>) {
  return {
    get(name: string) {
      return headers[name.toLowerCase()] ?? null;
    },
  };
}

describe("features/analytics/tracking", () => {
  it("creates a stable visitor hash for the same business and request", () => {
    const headerStore = createHeaderStore({
      "x-forwarded-for": "203.0.113.42",
      "user-agent": "Vitest Browser",
    });

    const firstHash = createBusinessScopedVisitorHash("biz_tracking", headerStore);
    const secondHash = createBusinessScopedVisitorHash(
      "biz_tracking",
      headerStore,
    );

    expect(firstHash).toBe(secondHash);
  });

  it("scopes visitor hashes to the business", () => {
    const headerStore = createHeaderStore({
      "x-forwarded-for": "203.0.113.42",
      "user-agent": "Vitest Browser",
    });

    const businessOneHash = createBusinessScopedVisitorHash(
      "biz_tracking_one",
      headerStore,
    );
    const businessTwoHash = createBusinessScopedVisitorHash(
      "biz_tracking_two",
      headerStore,
    );

    expect(businessOneHash).not.toBe(businessTwoHash);
  });

  it("falls back safely when no usable IP address is present", () => {
    const headerStore = createHeaderStore({
      "x-forwarded-for": "unknown",
      "user-agent": "Vitest Browser",
    });

    const firstHash = createBusinessScopedVisitorHash("biz_tracking", headerStore);
    const secondHash = createBusinessScopedVisitorHash("biz_tracking", {
      get(name: string) {
        if (name.toLowerCase() === "user-agent") {
          return "Vitest Browser";
        }

        return null;
      },
    });

    expect(firstHash).toBe(secondHash);
  });
});
