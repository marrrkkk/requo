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

// Mock the config module so we can control which providers are available
vi.mock("@/lib/ai/config", () => ({
  getConfiguredProviders: vi.fn(() => [] as AiProvider[]),
  isAiConfigured: vi.fn(() => false),
}));

// Import after mocking
import { getConfiguredProviders } from "@/lib/ai/config";
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

function makeProvider(
  name: "groq" | "gemini" | "openrouter",
  overrides: Partial<AiProvider> = {},
): AiProvider {
  return {
    name,
    isConfigured: () => true,
    generateCompletion: vi.fn(async (): Promise<AiCompletionResponse> => ({
      provider: name,
      model: `${name}-model`,
      text: `Response from ${name}`,
    })),
    generateStream: vi.fn(async (): Promise<AiStreamResponse> => ({
      provider: name,
      model: `${name}-model`,
      stream: (async function* () {
        yield { delta: `Streamed from ${name}` };
      })(),
    })),
    ...overrides,
  };
}

function makeRetryableError(
  provider: "groq" | "gemini" | "openrouter",
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
  provider: "groq" | "gemini" | "openrouter",
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
    vi.restoreAllMocks();
  });

  it("succeeds with the first provider (Groq)", async () => {
    const groq = makeProvider("groq");
    const gemini = makeProvider("gemini");
    const openrouter = makeProvider("openrouter");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini, openrouter]);

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("groq");
    expect(result.text).toBe("Response from groq");
    expect(groq.generateCompletion).toHaveBeenCalledOnce();
    expect(gemini.generateCompletion).not.toHaveBeenCalled();
    expect(openrouter.generateCompletion).not.toHaveBeenCalled();
  });

  it("falls back to Gemini when Groq returns 429", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("groq", 429);
      }),
    });
    const gemini = makeProvider("gemini");
    const openrouter = makeProvider("openrouter");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini, openrouter]);

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("gemini");
    expect(result.text).toBe("Response from gemini");
    expect(groq.generateCompletion).toHaveBeenCalledOnce();
    expect(gemini.generateCompletion).toHaveBeenCalledOnce();
    expect(openrouter.generateCompletion).not.toHaveBeenCalled();
  });

  it("falls back through entire chain: Groq → Gemini → OpenRouter", async () => {
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
    const openrouter = makeProvider("openrouter");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini, openrouter]);

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("openrouter");
    expect(result.text).toBe("Response from openrouter");
    expect(groq.generateCompletion).toHaveBeenCalledOnce();
    expect(gemini.generateCompletion).toHaveBeenCalledOnce();
    expect(openrouter.generateCompletion).toHaveBeenCalledOnce();
  });

  it("stops immediately on non-retryable error (401)", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeNonRetryableError("groq", 401);
      }),
    });
    const gemini = makeProvider("gemini");
    const openrouter = makeProvider("openrouter");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini, openrouter]);

    await expect(generateWithFallback(mockRequest)).rejects.toThrow("Unauthorized (401)");

    expect(groq.generateCompletion).toHaveBeenCalledOnce();
    expect(gemini.generateCompletion).not.toHaveBeenCalled();
    expect(openrouter.generateCompletion).not.toHaveBeenCalled();
  });

  it("stops immediately on 400 bad request", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeNonRetryableError("groq", 400);
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);

    await expect(generateWithFallback(mockRequest)).rejects.toThrow();
    expect(gemini.generateCompletion).not.toHaveBeenCalled();
  });

  it("throws when all providers fail with retryable errors", async () => {
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
    const openrouter = makeProvider("openrouter", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("openrouter", 504);
      }),
    });

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini, openrouter]);

    await expect(generateWithFallback(mockRequest)).rejects.toThrow();
  });

  it("throws when no providers are configured", async () => {
    vi.mocked(getConfiguredProviders).mockReturnValue([]);

    await expect(generateWithFallback(mockRequest)).rejects.toThrow(
      "No AI providers are configured",
    );
  });

  it("skips unconfigured providers", async () => {
    const groq = makeProvider("groq", {
      isConfigured: () => false,
    });
    const gemini = makeProvider("gemini");

    // getConfiguredProviders filters, so only return the configured one
    vi.mocked(getConfiguredProviders).mockReturnValue([gemini]);

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("gemini");
    expect(groq.generateCompletion).not.toHaveBeenCalled();
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

    // Start the fallback, which will sleep for 5s (capped from 10s)
    const resultPromise = generateWithFallback(mockRequest);

    // Advance fake timers past the capped wait
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

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("gemini");
  });

  it("handles 409 conflict as retryable", async () => {
    const groq = makeProvider("groq", {
      generateCompletion: vi.fn(async () => {
        throw makeRetryableError("groq", 409);
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);

    const result = await generateWithFallback(mockRequest);

    expect(result.provider).toBe("gemini");
  });
});

// ---------------------------------------------------------------------------
// Tests — streamWithFallback
// ---------------------------------------------------------------------------

describe("streamWithFallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("streams from the first provider", async () => {
    const groq = makeProvider("groq");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq]);

    const result = await streamWithFallback(mockRequest);

    expect(result.provider).toBe("groq");

    const chunks: string[] = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk.delta);
    }

    expect(chunks).toEqual(["Streamed from groq"]);
  });

  it("falls back to Gemini when Groq stream connection fails", async () => {
    const groq = makeProvider("groq", {
      generateStream: vi.fn(async () => {
        throw makeRetryableError("groq", 429);
      }),
    });
    const gemini = makeProvider("gemini");

    vi.mocked(getConfiguredProviders).mockReturnValue([groq, gemini]);

    const result = await streamWithFallback(mockRequest);

    expect(result.provider).toBe("gemini");
    expect(groq.generateStream).toHaveBeenCalledOnce();
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

    await expect(streamWithFallback(mockRequest)).rejects.toThrow("Unauthorized (401)");
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
