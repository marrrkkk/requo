import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  isGroqConfigured: true,
  isCerebrasConfigured: true,
  isGeminiConfigured: true,
  isOpenRouterConfigured: true,
  isMistralConfigured: true,
  isCloudflareAiConfigured: true,
  isNvidiaNimConfigured: true,
}));

import {
  _resetUsageCounters,
  selectModels,
} from "@/lib/ai/capacity-selector";

beforeEach(async () => {
  await _resetUsageCounters();
});

describe("capacity selector profiles", () => {
  it("serves the assistant from the most generous tool-capable allowance first", async () => {
    const models = await selectModels({
      profile: "assistant_chat",
      estimatedTokens: 100,
    });

    expect(models.length).toBeGreaterThan(0);
    // Gemini Flash-Lite leads the assistant chain; Groq sits late.
    expect(models[0]).toBe("google:gemini-2.5-flash-lite");
    const groqIndex = models.findIndex((m) => m.startsWith("groq:"));
    expect(groqIndex).toBeGreaterThan(0);
    // Reserve stays last.
    expect(models[models.length - 1]).toBe("google:gemini-2.5-pro");
    // Tool-incapable providers are excluded entirely.
    expect(models.some((m) => m.startsWith("cloudflare:"))).toBe(false);
    expect(models.some((m) => m.startsWith("nvidia:"))).toBe(false);
  });

  it("serves the public agent from the fastest fitting provider", async () => {
    const models = await selectModels({
      profile: "agent_chat",
      estimatedTokens: 100,
    });

    expect(models[0]).toBe("groq:openai/gpt-oss-20b");
  });

  it("never offers Groq a quote draft it cannot fit", async () => {
    const models = await selectModels({
      profile: "quote_draft",
      estimatedTokens: 8000,
    });

    expect(models.some((m) => m.startsWith("groq:"))).toBe(false);
    expect(models[0]).toBe("mistral:mistral-medium-latest");
    expect(models[models.length - 1]).toBe("google:gemini-2.5-pro");
  });

  it("routes short background work to small models", async () => {
    const models = await selectModels({
      profile: "short_text",
      estimatedTokens: 300,
    });

    expect(models[0]).toBe("groq:openai/gpt-oss-20b");
  });

  it("never ranks the reserve model above a non-reserve model", async () => {
    const models = await selectModels({
      profile: "assistant_chat",
      estimatedTokens: 100,
    });

    const reserveIndex = models.indexOf("google:gemini-2.5-pro");
    const firstIndex = models.indexOf("google:gemini-2.5-flash-lite");
    expect(reserveIndex).toBeGreaterThan(firstIndex);
  });

  it("marks a small-TPM model stressed for a large turn without evicting it", async () => {
    // 100k tokens: Groq (8k) is stressed, Gemini (250k) still fits.
    const models = await selectModels({
      profile: "assistant_chat",
      estimatedTokens: 100_000,
    });

    expect(models).toContain("groq:openai/gpt-oss-120b");
    expect(models).toContain("google:gemini-2.5-flash-lite");
    // High-TPM head still leads; stressed Groq remains as fallback.
    expect(models[0]).toBe("google:gemini-2.5-flash-lite");
  });

  it("filters out providers that are not configured", async () => {
    const models = await selectModels({
      profile: "assistant_chat",
      estimatedTokens: 100,
    });

    expect(models.length).toBeGreaterThan(0);
    for (const modelId of models) {
      expect(modelId).toMatch(/^(groq|cerebras|google|mistral|openrouter|cloudflare|nvidia):/);
    }
  });
});
