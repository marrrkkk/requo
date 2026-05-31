import { describe, expect, it } from "vitest";

import {
  createOptimisticId,
  isOptimisticId,
  OPTIMISTIC_ID_PREFIX,
} from "@/lib/optimistic/id";

describe("optimistic id helpers", () => {
  it("creates ids with the optimistic prefix", () => {
    const id = createOptimisticId();
    expect(id.startsWith(OPTIMISTIC_ID_PREFIX)).toBe(true);
    expect(isOptimisticId(id)).toBe(true);
  });

  it("detects non-optimistic ids", () => {
    expect(isOptimisticId("inq_abc123")).toBe(false);
  });
});
