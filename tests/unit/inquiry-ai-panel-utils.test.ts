import { describe, expect, it } from "vitest";

import {
  getScrollTopAfterPrepend,
  isScrollNearBottom,
  mergeChronologicalMessages,
} from "@/features/ai/components/inquiry-ai-panel-utils";

describe("inquiry AI panel scroll helpers", () => {
  it("keeps the viewport anchored after older messages are prepended", () => {
    expect(
      getScrollTopAfterPrepend({
        previousScrollHeight: 1000,
        previousScrollTop: 120,
        nextScrollHeight: 1600,
      }),
    ).toBe(720);
  });

  it("detects whether the user is already near the bottom", () => {
    expect(
      isScrollNearBottom({
        scrollHeight: 1000,
        scrollTop: 820,
        clientHeight: 120,
        threshold: 80,
      }),
    ).toBe(true);
    expect(
      isScrollNearBottom({
        scrollHeight: 1000,
        scrollTop: 700,
        clientHeight: 120,
        threshold: 80,
      }),
    ).toBe(false);
  });

  it("prepends older messages without duplicating existing messages", () => {
    expect(
      mergeChronologicalMessages(
        [{ id: "m1" }, { id: "m2" }],
        [{ id: "m2" }, { id: "m3" }],
      ),
    ).toEqual([{ id: "m1" }, { id: "m2" }, { id: "m3" }]);
  });
});
