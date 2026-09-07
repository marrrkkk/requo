import { describe, it, expect, vi, beforeEach } from "vitest";

import type { AiCompletionRequest } from "@/lib/ai/types";
import { AiProviderError } from "@/lib/ai/errors";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/ai/registry", () => ({
  registry: {
    languageModel: vi.fn(() => ({ modelId: "mock-model" })),
  },
  groq: { id: "groq" },
  cerebras: { id: "cerebras" },
  google: { id: "google" },
  openrouter: { id: "openrouter" },
  mistral: { id: "mistral" },
  cloudflare: { id: "cloudflare" },
  nvidia: { id: "nvidia" },
}));

vi.mock("@/lib/ai/model-options", () => ({
  aiProviderNames: ["groq", "cerebras", "gemini", "openrouter"],
  aiQualityTiers: ["balanced", "cheap", "best"],
  aiProviderModels: {
    groq: { balanced: ["model-a", "model-b"], cheap: ["model-a"], best: ["model-a"] },
    cerebras: { balanced: ["model-c"], cheap: ["model-c"], best: ["model-c"] },
    gemini: { balanced: ["model-d"], cheap: ["model-d"], best: ["model-d"] },
    openrouter: { balanced: ["model-e"], cheap: ["model-e"], best: ["model-e"] },
  },
  getModelsForProvider: vi.fn((provider: string, tier: string) => {
    const models: Record<string, Record<string, string[]>> = {
      groq: { balanced: ["model-a", "model-b"], cheap: ["model-a"], best: ["model-a"] },
      cerebras: { balanced: ["model-c"], cheap: ["model-c"], best: ["model-c"] },
      gemini: { balanced: ["model-d"], cheap: ["model-d"], best: ["model-d"] },
      openrouter: { balanced: ["model-e"], cheap: ["model-e"], best: ["model-e"] },
    };
    return models[provider]?.[tier] ?? ["default-model"];
  }),
  autoAiModelOptionValue: "auto",
  parseAiModelOptionValue: vi.fn(() => null),
  getAllAiModelOptions: vi.fn(() => []),
  formatAiProviderName: vi.fn((p: string) => p),
  createAiModelOptionValue: vi.fn((s: { provider: string; model: string }) => `${s.provider}|${s.model}`),
}));

const mockGenerateText = vi.fn();
const mockStreamText = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  streamText: (...args: unknown[]) => mockStreamText(...args),
  createProviderRegistry: vi.fn(() => ({
    languageModel: vi.fn(() => ({ modelId: "mock" })),
  })),
  customProvider: vi.fn(),
}));

// Mock capacity selector — full surface incl. new bookkeeping exports
const mockSelectModels = vi.fn((..._args: unknown[]) => [
  "groq:model-a" as `${string}:${string}`,
  "groq:model-b" as `${string}:${string}`,
  "cerebras:model-c" as `${string}:${string}`,
  "google:model-d" as `${string}:${string}`,
  "openrouter:model-e" as `${string}:${string}`,
]);
const mockRecordModelUsage = vi.fn((..._args: unknown[]) => Promise.resolve());
const mockMarkModelExhausted = vi.fn((..._args: unknown[]) => Promise.resolve());
const mockMarkModelDead = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock("@/lib/ai/capacity-selector", () => ({
  selectModels: (..._args: unknown[]) => mockSelectModels(..._args),
  recordModelUsage: (..._args: unknown[]) => mockRecordModelUsage(..._args),
  recordModelTokenUsage: (..._args: unknown[]) => Promise.resolve(),
  recordModelTokenUsageDetailed: (..._args: unknown[]) => Promise.resolve(),
  correctTokenUsage: (..._args: unknown[]) => Promise.resolve(),
  markModelExhausted: (..._args: unknown[]) => mockMarkModelExhausted(..._args),
  markModelDead: (..._args: unknown[]) => mockMarkModelDead(..._args),
  isModelDead: (..._args: unknown[]) => Promise.resolve(false),
  NON_CHAT_MAX_ATTEMPTS: 4,
  CHAT_MAX_ATTEMPTS: 5,
}));

vi.mock("@/lib/ai/catalog", () => ({
  getCatalogEntry: vi.fn(() => ({ contextWindow: 128_000 })),
  getModelCatalog: vi.fn(() => []),
  getDerivedCostTable: vi.fn(() => ({})),
}));

import { generateWithFallback, streamWithFallback } from "@/lib/ai/router";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockRequest: AiCompletionRequest = {
  model: "",
  messages: [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Hello." },
  ],
  temperature: 0.2,
  maxOutputTokens: 500,
};

function makeRetryableError(
  provider: "groq" | "gemini" | "cerebras",
  statusCode: number,
): AiProviderError {
  return new AiProviderError(
    provider,
    statusCode,
    true,
    null,
    `Rate limited (${statusCode})`,
  );
}

function makeNonRetryableError(
  provider: "groq" | "gemini" | "cerebras",
  statusCode: number,
): AiProviderError {
  return new AiProviderError(
    provider,
    statusCode,
    false,
    null,
    `Unauthorized (${statusCode})`,
  );
}

// ---------------------------------------------------------------------------
// Tests — generateWithFallback
// ---------------------------------------------------------------------------

describe("generateWithFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockReset();
    mockStreamText.mockReset();
  });

  it("succeeds with the first model on first provider", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "Hello world",
      usage: { inputTokens: 10, outputTokens: 5 },
    });

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("model-a");
    expect(result.text).toBe("Hello world");
    expect(mockGenerateText).toHaveBeenCalledOnce();
  });

  it("falls back to next model when first returns retryable error", async () => {
    mockGenerateText
      .mockRejectedValueOnce(makeRetryableError("groq", 429))
      .mockResolvedValueOnce({
        text: "Fallback response",
        usage: { inputTokens: 10, outputTokens: 5 },
      });

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("model-b");
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it("moves to next provider after all models fail on first provider", async () => {
    mockGenerateText
      .mockRejectedValueOnce(makeRetryableError("groq", 429))
      .mockRejectedValueOnce(makeRetryableError("groq", 429))
      .mockResolvedValueOnce({
        text: "Cerebras response",
        usage: { inputTokens: 10, outputTokens: 5 },
      });

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("cerebras");
    expect(result.model).toBe("model-c");
    expect(mockGenerateText).toHaveBeenCalledTimes(3);
  });

  it("advances on non-retryable errors instead of stopping", async () => {
    mockGenerateText
      .mockRejectedValueOnce(makeNonRetryableError("groq", 401))
      .mockResolvedValueOnce({
        text: "Recovered",
        usage: { inputTokens: 10, outputTokens: 5 },
      });

    const result = await generateWithFallback(mockRequest);

    expect(result.text).toBe("Recovered");
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it("skips dead identifiers without consuming the budget", async () => {
    mockGenerateText
      .mockRejectedValueOnce(
        new AiProviderError("groq", 404, false, null, "model_not_found"),
      )
      .mockRejectedValueOnce(
        new AiProviderError("groq", 404, false, null, "model_not_found"),
      )
      .mockRejectedValueOnce(
        new AiProviderError("groq", 404, false, null, "model_not_found"),
      )
      .mockResolvedValueOnce({
        text: "Alive",
        usage: { inputTokens: 10, outputTokens: 5 },
      });

    const result = await generateWithFallback(mockRequest);

    // Three 404s cost no attempts; the fourth candidate still serves.
    expect(result.text).toBe("Alive");
    expect(mockMarkModelDead).toHaveBeenCalledTimes(3);
  });

  it("throws when all providers and models fail", async () => {
    mockGenerateText
      .mockRejectedValueOnce(makeRetryableError("groq", 429))
      .mockRejectedValueOnce(makeRetryableError("groq", 429))
      .mockRejectedValueOnce(makeRetryableError("cerebras", 500))
      .mockRejectedValueOnce(makeRetryableError("gemini", 502))
      .mockRejectedValue(new AiProviderError("groq", 503, true, null, "Service unavailable"));

    await expect(generateWithFallback(mockRequest)).rejects.toThrow();
  });

  it("throws when no providers are configured", async () => {
    const registryModule = await import("@/lib/ai/registry");
    const originalGroq = registryModule.groq;
    const originalCerebras = registryModule.cerebras;
    const originalGoogle = registryModule.google;
    const originalOpenrouter = registryModule.openrouter;

    (registryModule as Record<string, unknown>).groq = null;
    (registryModule as Record<string, unknown>).cerebras = null;
    (registryModule as Record<string, unknown>).google = null;
    (registryModule as Record<string, unknown>).openrouter = null;
    mockSelectModels.mockReturnValueOnce([]);

    await expect(generateWithFallback(mockRequest)).rejects.toThrow(
      "No AI providers are configured",
    );

    (registryModule as Record<string, unknown>).groq = originalGroq;
    (registryModule as Record<string, unknown>).cerebras = originalCerebras;
    (registryModule as Record<string, unknown>).google = originalGoogle;
    (registryModule as Record<string, unknown>).openrouter = originalOpenrouter;
  });

  it("selects via routing profile (legacy cheap maps to short_text)", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "cheap response",
      usage: { inputTokens: 5, outputTokens: 3 },
    });

    await generateWithFallback({ ...mockRequest, qualityTier: "cheap" });

    expect(mockSelectModels).toHaveBeenCalledWith(
      expect.objectContaining({ profile: "short_text" }),
    );
  });

  it("passes an explicit routing profile and token estimate", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "ok",
      usage: { inputTokens: 5, outputTokens: 3 },
    });

    await generateWithFallback({
      ...mockRequest,
      routingProfile: "quote_draft",
      estimatedTokens: 5000,
    });

    expect(mockSelectModels).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "quote_draft",
        estimatedTokens: 5000,
      }),
    );
  });

  it("respects Retry-After cap at 5 seconds", async () => {
    vi.useFakeTimers();

    mockGenerateText
      .mockRejectedValueOnce(new AiProviderError("groq", 429, true, 10_000, "Rate limited"))
      .mockResolvedValueOnce({
        text: "After retry",
        usage: { inputTokens: 10, outputTokens: 5 },
      });

    const resultPromise = generateWithFallback(mockRequest);
    await vi.advanceTimersByTimeAsync(5_100);

    const result = await resultPromise;
    expect(result.text).toBe("After retry");

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Tests — streamWithFallback
// ---------------------------------------------------------------------------

describe("streamWithFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockReset();
    mockStreamText.mockReset();
  });

  it("streams from first provider and model", async () => {
    mockStreamText.mockReturnValueOnce({
      textStream: (async function* () {
        yield "Hello ";
        yield "world";
      })(),
      response: Promise.resolve({ messages: [{}] }),
    });

    const result = await streamWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("model-a");

    const chunks: string[] = [];
    for await (const chunk of result.stream) {
      if (chunk.delta) chunks.push(chunk.delta);
    }
    expect(chunks).toEqual(["Hello ", "world"]);
  });

  it("falls back on retryable stream error", async () => {
    mockStreamText
      .mockImplementationOnce(() => {
        throw makeRetryableError("groq", 429);
      })
      .mockReturnValueOnce({
        textStream: (async function* () {
          yield "Fallback stream";
        })(),
        response: Promise.resolve({ messages: [{}] }),
      });

    const result = await streamWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("model-b");
  });

  it("advances on non-retryable stream errors", async () => {
    mockStreamText
      .mockImplementationOnce(() => {
        throw makeNonRetryableError("groq", 401);
      })
      .mockReturnValueOnce({
        textStream: (async function* () {
          yield "Recovered stream";
        })(),
        response: Promise.resolve({ messages: [{}] }),
      });

    const result = await streamWithFallback(mockRequest);

    expect(result.model).toBe("model-b");
  });

  it("throws when no providers are configured", async () => {
    const registryModule = await import("@/lib/ai/registry");
    const originalGroq = registryModule.groq;
    const originalCerebras = registryModule.cerebras;
    const originalGoogle = registryModule.google;
    const originalOpenrouter = registryModule.openrouter;

    (registryModule as Record<string, unknown>).groq = null;
    (registryModule as Record<string, unknown>).cerebras = null;
    (registryModule as Record<string, unknown>).google = null;
    (registryModule as Record<string, unknown>).openrouter = null;
    mockSelectModels.mockReturnValueOnce([]);

    await expect(streamWithFallback(mockRequest)).rejects.toThrow(
      "No AI providers are configured",
    );

    (registryModule as Record<string, unknown>).groq = originalGroq;
    (registryModule as Record<string, unknown>).cerebras = originalCerebras;
    (registryModule as Record<string, unknown>).google = originalGoogle;
    (registryModule as Record<string, unknown>).openrouter = originalOpenrouter;
  });
});

// ---------------------------------------------------------------------------
// Tests — error classification
// ---------------------------------------------------------------------------

describe("AiProviderError", () => {
  it("carries provider, status, and retryable info", () => {
    const err = new AiProviderError("groq", 429, true, 2000, "Rate limited");

    expect(err.provider).toBe("groq");
    expect(err.statusCode).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.retryAfterMs).toBe(2000);
    expect(err.message).toBe("Rate limited");
    expect(err.name).toBe("AiProviderError");
  });

  it("creates non-retryable error", () => {
    const err = new AiProviderError("gemini", 401, false, null, "Bad key");

    expect(err.retryable).toBe(false);
    expect(err.statusCode).toBe(401);
  });
});
