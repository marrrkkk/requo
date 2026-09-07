import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({ db: {} }));

import { computeEstimatedCostCents } from "@/features/ai-agent/telemetry";

describe("computeEstimatedCostCents (catalog-priced)", () => {
  it("prices catalog entries from the real catalog", () => {
    // groq gpt-oss-120b: 15 in / 60 out per 1M
    expect(
      computeEstimatedCostCents({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        model: "openai/gpt-oss-120b",
        provider: "groq",
      }),
    ).toBe(75);
  });

  it("accepts a full registry ID", () => {
    expect(
      computeEstimatedCostCents({
        inputTokens: 1_000_000,
        outputTokens: 0,
        model: "groq:openai/gpt-oss-20b",
      }),
    ).toBe(7.5);
  });

  it("prices free-tier overflow at zero, not the default rate", () => {
    expect(
      computeEstimatedCostCents({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        model: "z-ai/glm-4.5-air:free",
        provider: "openrouter",
      }),
    ).toBe(0);
  });

  it("returns zero for unknown models instead of a default rate", () => {
    expect(
      computeEstimatedCostCents({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        model: "some-custom-model",
      }),
    ).toBe(0);
  });
});
