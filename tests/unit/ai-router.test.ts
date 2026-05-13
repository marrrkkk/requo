import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
  AiStreamResponse,
} from "@/lib/ai/types";
import { AiProviderError } from "@/lib/ai/errors";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the config module so we can control providers and model lists
vi.mock("@/lib/ai/config", () => ({
  getConfiguredProviders: vi.fn(() => [] as AiProvider[]),
  getModelsForProvider: vi.fn(() => ["default-model"]),
  isAiConfigured: vi.fn(() => false),
}));

// Import after mocking
import { getConfiguredProviders, getModelsForProvider } from "@/lib/ai/config";
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

/** Track which model was actually requested by the provider mock. */
function makeProvider(
  name: "groq" | "gemini" | "cerebras",
  overrides: Partial<AiProvider> = {},
): AiProvider {
  return {
    name,
    isConfigured: () => true,
    generateCompletion: vi.fn(
      async (req: AiCompletionRequest): Promise<AiCompletionResponse> => ({
        provider: name,
        model: req.model,
        text: `Response from ${name}/${req.model}`,
      }),
    ),
    generateStream: vi.fn(
      async (req: AiCompletionRequest): Promise<AiStreamResponse> => ({
        provider: name,
        model: req.model,
        stream: (async function* () {
          yield { delta: `Streamed from ${name}/${req.model}` };
        })(),
      }),
    ),
    ...overrides,
  };
}

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

function setupModels(models: Record<string, string[]>) {
  vi.mocked(getModelsForProvider).mockImplementation(
    (provider: string) => models[provider] ?? ["default-model"],
  );
}

// ---------------------------------------------------------------------------
// Tests — generateWithFallback (model-level fallback)
// ---------------------------------------------------------------------------

describe("generateWithFallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("succeeds with the first Groq model", async () => {
    const groq = makeProvider("groq");
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);
    setupModels({
      groq: ["qwen/qwen3-32b", "llama-3.3-70b-versatile"],
      gemini: ["gemini-2.5-flash"],
    });

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("qwen/qwen3-32b");
    expect(result.text).toBe("Response from groq/qwen/qwen3-32b");
    expect(groq.generateCompletion).toHaveBeenCalledOnce();
    expect(gemini.generateCompletion).not.toHaveBeenCalled();
  });

  it("falls back to Groq second model when first returns 429", async () => {
    let callCount = 0;

    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(
        async (req: AiCompletionRequest): Promise<AiCompletionResponse> => {
          callCount += 1;

          if (callCount === 1) {
            throw makeRetryableError("groq", 429);
          }

          return {
            provider: "groq",
            model: req.model,
            text: `Response from groq/${req.model}`,
          };
        },
      ),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);
    setupModels({
      groq: ["qwen/qwen3-32b", "llama-3.3-70b-versatile"],
      gemini: ["gemini-2.5-flash"],
    });

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("llama-3.3-70b-versatile");
    expect(groq.generateCompletion).toHaveBeenCalledTimes(2);
    expect(gemini.generateCompletion).not.toHaveBeenCalled();
  });

  it("moves to Gemini after all Groq models fail", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("groq", 429);
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);
    setupModels({
      groq: ["qwen/qwen3-32b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
      gemini: ["gemini-2.5-flash"],
    });

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-2.5-flash");
    // All 3 Groq models tried
    expect(groq.generateCompletion).toHaveBeenCalledTimes(3);
    expect(gemini.generateCompletion).toHaveBeenCalledOnce();
  });

  it("moves to cerebras after Groq and Gemini models all fail", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("groq", 503);
      }),
    });
    const gemini = makeProvider("gemini", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("gemini", 502);
      }),
    });
    const cerebras = makeProvider("cerebras");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini, cerebras]);
    setupModels({
      groq: ["qwen/qwen3-32b", "llama-3.3-70b-versatile"],
      gemini: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
      cerebras: ["nvidia/nemotron-3-super:free"],
    });

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("cerebras");
    expect(result.model).toBe("nvidia/nemotron-3-super:free");
    expect(groq.generateCompletion).toHaveBeenCalledTimes(2);
    expect(gemini.generateCompletion).toHaveBeenCalledTimes(2);
    expect(cerebras.generateCompletion).toHaveBeenCalledOnce();
  });

  it("stops immediately on 401 without trying more models or providers", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeNonRetryableError("groq", 401);
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);
    setupModels({
      groq: ["qwen/qwen3-32b", "llama-3.3-70b-versatile"],
      gemini: ["gemini-2.5-flash"],
    });

    await expect(generateWithFallback(mockRequest)).rejects.toThrow("Unauthorized (401)");

    // Only the first model was tried
    expect(groq.generateCompletion).toHaveBeenCalledOnce();
    expect(gemini.generateCompletion).not.toHaveBeenCalled();
  });

  it("stops immediately on 400 bad request", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeNonRetryableError("groq", 400);
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);
    setupModels({
      groq: ["qwen/qwen3-32b"],
      gemini: ["gemini-2.5-flash"],
    });

    await expect(generateWithFallback(mockRequest)).rejects.toThrow();
    expect(gemini.generateCompletion).not.toHaveBeenCalled();
  });

  it("includes provider and model in the response", async () => {
    const groq = makeProvider("groq");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq]);
    setupModels({ groq: ["llama-3.3-70b-versatile"] });

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("llama-3.3-70b-versatile");
  });

  it("throws when all providers and models fail", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("groq", 429);
      }),
    });
    const gemini = makeProvider("gemini", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("gemini", 500);
      }),
    });
    const cerebras = makeProvider("cerebras", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("cerebras", 504);
      }),
    });

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini, cerebras]);
    setupModels({
      groq: ["model-a", "model-b"],
      gemini: ["model-c"],
      cerebras: ["model-d"],
    });

    await expect(generateWithFallback(mockRequest)).rejects.toThrow();
    expect(groq.generateCompletion).toHaveBeenCalledTimes(2);
    expect(gemini.generateCompletion).toHaveBeenCalledTimes(1);
    expect(cerebras.generateCompletion).toHaveBeenCalledTimes(1);
  });

  it("throws when no providers are configured", async () => {
    vi.mocked(getConfiguredProviders).mockReturnValue([]);

    await expect(generateWithFallback(mockRequest)).rejects.toThrow(
      "No AI providers are configured",
    );
  });

  it("respects Retry-After but caps at 5 seconds", async () => {
    vi.useFakeTimers();

    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw new AiProviderError("groq", 429, true, 10_000, "Rate limited");
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);
    setupModels({
      groq: ["model-a"],
      gemini: ["model-b"],
    });

    const resultPromise = generateWithFallback(mockRequest);

    await vi.advanceTimersByTimeAsync(5_100);

    const result = await resultPromise;

    expect(result.provider).toBe("gemini");
    expect(groq.generateCompletion).toHaveBeenCalledOnce();
    expect(gemini.generateCompletion).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("handles 408 timeout as retryable", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("groq", 408);
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);
    setupModels({
      groq: ["model-a"],
      gemini: ["model-b"],
    });

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("gemini");
  });

  it("passes qualityTier through to getModelsForProvider", async () => {
    const groq = makeProvider("groq");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq]);
    setupModels({ groq: ["cheap-model"] });

    const result = await generateWithFallback({
      ...mockRequest,
      qualityTier: "cheap",
    });

    expect(result.provider).toBe("groq");
    expect(vi.mocked(getModelsForProvider)).toHaveBeenCalledWith("groq", "cheap");
  });

  it("defaults to balanced tier when qualityTier is not set", async () => {
    const groq = makeProvider("groq");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq]);
    setupModels({ groq: ["balanced-model"] });

    await generateWithFallback(mockRequest);

    expect(vi.mocked(getModelsForProvider)).toHaveBeenCalledWith("groq", "balanced");
  });
});

// ---------------------------------------------------------------------------
// Tests — streamWithFallback (model-level fallback)
// ---------------------------------------------------------------------------

describe("streamWithFallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("streams from the first provider and model", async () => {
    const groq = makeProvider("groq");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq]);
    setupModels({ groq: ["qwen/qwen3-32b"] });

    const result = await streamWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("qwen/qwen3-32b");

    const chunks: string[] = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk.delta);
    }

    expect(chunks).toEqual(["Streamed from groq/qwen/qwen3-32b"]);
  });

  it("falls back to next model when first stream connection fails", async () => {
    let callCount = 0;

    const groq = makeProvider("groq", {
      generateStream: vi.fn(
        async (req: AiCompletionRequest): Promise<AiStreamResponse> => {
          callCount += 1;

          if (callCount === 1) {
            throw makeRetryableError("groq", 429);
          }

          return {
            provider: "groq",
            model: req.model,
            stream: (async function* () {
              yield { delta: `Streamed from groq/${req.model}` };
            })(),
          };
        },
      ),
    });

    vi.mocked(getConfiguredProviders).mockReturnValue([groq]);
    setupModels({ groq: ["model-a", "model-b"] });

    const result = await streamWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("model-b");
    expect(groq.generateStream).toHaveBeenCalledTimes(2);
  });

  it("falls back to Gemini when all Groq stream connections fail", async () => {
    const groq = makeProvider("groq", {
      generateStream: vi.fn(async () => {
        throw makeRetryableError("groq", 429);
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);
    setupModels({
      groq: ["model-a", "model-b"],
      gemini: ["gemini-2.5-flash"],
    });

    const result = await streamWithFallback(mockRequest);

    expect(result.provider).toBe("gemini");
    expect(groq.generateStream).toHaveBeenCalledTimes(2);
    expect(gemini.generateStream).toHaveBeenCalledOnce();
  });

  it("stops on non-retryable stream error", async () => {
    const groq = makeProvider("groq", {
      generateStream: vi.fn(async () => {
        throw makeNonRetryableError("groq", 401);
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);
    setupModels({
      groq: ["model-a", "model-b"],
      gemini: ["gemini-2.5-flash"],
    });

    await expect(streamWithFallback(mockRequest)).rejects.toThrow("Unauthorized (401)");
    // Stopped at first model, didn't try second or Gemini
    expect(groq.generateStream).toHaveBeenCalledOnce();
    expect(gemini.generateStream).not.toHaveBeenCalled();
  });

  it("throws when no providers are configured", async () => {
    vi.mocked(getConfiguredProviders).mockReturnValue([]);

    await expect(streamWithFallback(mockRequest)).rejects.toThrow(
      "No AI providers are configured",
    );
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

// ---------------------------------------------------------------------------
// Tests — config model lists
// ---------------------------------------------------------------------------

describe("getModelsForProvider (integration)", () => {
  // These tests use the REAL config module to verify the model lists
  // are well-formed. We un-mock and re-import.

  it("has non-empty model lists for all tiers", async () => {
    // Directly import the real module
    const { getModelsForProvider: realFn } = await vi.importActual<
      typeof import("@/lib/ai/config")
    >("@/lib/ai/config");

    for (const provider of ["groq", "gemini", "cerebras"] as const) {
      for (const tier of ["balanced", "cheap", "best", "coding"] as const) {
        const models = realFn(provider, tier);
        expect(models.length).toBeGreaterThan(0);
      }
    }
  });
});
