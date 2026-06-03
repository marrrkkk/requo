import { describe, expect, it } from "vitest";

import { publicPageCacheHeaders } from "@/lib/cache/public-page-headers";

describe("publicPageCacheHeaders", () => {
  it("returns correct Cache-Control header", () => {
    const headers = publicPageCacheHeaders();

    expect(headers).toHaveProperty(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  });

  it("returns Vary: Accept-Encoding header", () => {
    const headers = publicPageCacheHeaders();

    expect(headers).toHaveProperty("Vary", "Accept-Encoding");
  });

  it("returns exactly two headers", () => {
    const headers = publicPageCacheHeaders();

    expect(Object.keys(headers)).toHaveLength(2);
  });
});
