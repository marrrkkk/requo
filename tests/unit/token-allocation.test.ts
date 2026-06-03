import { describe, it, expect } from "vitest";
import { getMaxOutputTokensForIntent } from "@/features/ai/orchestrator/token-allocation";
import type { IntentCategory } from "@/features/ai/orchestrator/types";

describe("getMaxOutputTokensForIntent", () => {
  it("returns 800 for data_query", () => {
    expect(getMaxOutputTokensForIntent("data_query")).toBe(800);
  });

  it("returns 800 for general_question", () => {
    expect(getMaxOutputTokensForIntent("general_question")).toBe(800);
  });

  it("returns 2200 for quote_action", () => {
    expect(getMaxOutputTokensForIntent("quote_action")).toBe(2200);
  });

  it("returns 2200 for follow_up_action", () => {
    expect(getMaxOutputTokensForIntent("follow_up_action")).toBe(2200);
  });

  it("returns 1400 for analytics", () => {
    expect(getMaxOutputTokensForIntent("analytics")).toBe(1400);
  });

  it("returns 1400 for workflow_guidance", () => {
    expect(getMaxOutputTokensForIntent("workflow_guidance")).toBe(1400);
  });

  it("returns 1400 for memory_recall", () => {
    expect(getMaxOutputTokensForIntent("memory_recall")).toBe(1400);
  });

  it("covers all known intent categories", () => {
    const allIntents: IntentCategory[] = [
      "data_query",
      "general_question",
      "quote_action",
      "follow_up_action",
      "analytics",
      "workflow_guidance",
      "memory_recall",
    ];

    for (const intent of allIntents) {
      const result = getMaxOutputTokensForIntent(intent);
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
    }
  });
});
