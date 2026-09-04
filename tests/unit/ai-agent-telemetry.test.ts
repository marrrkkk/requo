import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({ db: {} }));

import { computeEstimatedCostCents } from "@/features/ai-agent/telemetry";

describe("computeEstimatedCostCents", () => {
  it("uses the default tier for unknown models", () => {
    expect(
      computeEstimatedCostCents({
        inputTokens: 1_000_000,
        outputTokens: 0,
        model: "some-custom-model",
      }),
    ).toBe(50);

    expect(
      computeEstimatedCostCents({
        inputTokens: 0,
        outputTokens: 1_000_000,
        model: "some-custom-model",
      }),
    ).toBe(150);
  });

  it("matches gpt-family models to their tier", () => {
    expect(
      computeEstimatedCostCents({
        inputTokens: 1_000_000,
        outputTokens: 0,
        model: "gpt-4",
      }),
    ).toBe(3000);

    expect(
      computeEstimatedCostCents({
        inputTokens: 1_000_000,
        outputTokens: 0,
        model: "gpt-3.5-turbo",
      }),
    ).toBe(50);
  });

  it("matches gemini and llama tiers case-insensitively", () => {
    expect(
      computeEstimatedCostCents({
        inputTokens: 100_000,
        outputTokens: 100_000,
        model: "Gemini-2.0-flash",
      }),
    ).toBe(14); // (0.1 * 35) + (0.1 * 105)

    expect(
      computeEstimatedCostCents({
        inputTokens: 1_000_000,
        outputTokens: 0,
        model: "LLAMA-3-70B",
      }),
    ).toBe(20);
  });

  it("rounds the result to two decimal places", () => {
    expect(
      computeEstimatedCostCents({
        inputTokens: 1,
        outputTokens: 0,
        model: "gpt-4",
      }),
    ).toBe(0); // (1 / 1M * 3000) * 100 rounds to 0

    expect(
      computeEstimatedCostCents({
        inputTokens: 500_000,
        outputTokens: 0,
        model: "claude-3-opus",
      }),
    ).toBe(150); // 0.5 * 300
  });
});