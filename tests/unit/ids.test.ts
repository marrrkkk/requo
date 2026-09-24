import { describe, expect, it } from "vitest";

import { newEntityId, prefixedId } from "@/lib/ids";

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("lib/ids", () => {
  it("emits RFC 9562 UUIDv7 strings for new entity ids", () => {
    for (let i = 0; i < 25; i += 1) {
      expect(newEntityId()).toMatch(UUID_V7);
    }
  });

  it("emits unique ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newEntityId()));
    expect(ids.size).toBe(1000);
  });

  it("keeps the prefixed helper for non-entity keys", () => {
    expect(prefixedId("asset")).toMatch(/^asset_[0-9a-f]{32}$/);
  });
});
