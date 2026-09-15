import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression coverage for embedding retry behaviour.
 *
 * The failure this guards against: `generateEmbeddingBatch` used to treat any
 * provider error — including a 429 — as terminal, marking all 20 entries of
 * the slice `null`. Those rows persist unembedded and silently fall back to
 * lexical retrieval, so a transient rate limit became permanent data loss.
 *
 * The retry budget is deliberately asymmetric: ingestion retries because a
 * `null` there is only repairable by the backfill job, while the retrieval
 * path attempts once because it sits on the user's critical path.
 */

const mockEmbed = vi.fn();
const mockEmbedMany = vi.fn();

vi.mock("ai", () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
  embedMany: (...args: unknown[]) => mockEmbedMany(...args),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => ({
    embeddingModel: (id: string) => ({ provider: "google", modelId: id }),
  }),
}));

vi.mock("@/lib/env", () => ({
  isGeminiConfigured: true,
  env: { GEMINI_API_KEY: "test-key" },
}));

vi.mock("@/lib/ai/cache-layer", () => ({
  cacheLayer: {
    get: async () => null,
    set: async () => undefined,
    delete: async () => undefined,
  },
}));

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MAX_ATTEMPTS_READ,
  EMBEDDING_MAX_ATTEMPTS_WRITE,
  generateEmbedding,
  generateEmbeddings,
} from "@/lib/ai/embeddings";

function vector(length = EMBEDDING_DIMENSIONS): number[] {
  return Array.from({ length }, () => 0.01);
}

function providerError(
  message: string,
  status?: number,
  retryAfterSeconds?: number,
) {
  return Object.assign(new Error(message), {
    ...(status === undefined ? {} : { status }),
    ...(retryAfterSeconds === undefined
      ? {}
      : { headers: { "retry-after": String(retryAfterSeconds) } }),
  });
}

function rateLimitError(retryAfterSeconds?: number) {
  return providerError("rate limit exceeded", 429, retryAfterSeconds);
}

/** Let the async chain advance past its awaits without advancing timers. */
async function flushMicrotasks(times = 10) {
  for (let index = 0; index < times; index++) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("embedding retry", () => {
  it("retries a rate-limited call and succeeds on the next attempt", async () => {
    mockEmbed
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValueOnce({ embedding: vector() });

    const pending = generateEmbedding("a solar install quote");
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toHaveLength(EMBEDDING_DIMENSIONS);
    expect(mockEmbed).toHaveBeenCalledTimes(2);
  });

  it("honours the provider retry-after delay over the default backoff", async () => {
    mockEmbed
      .mockRejectedValueOnce(rateLimitError(2))
      .mockResolvedValueOnce({ embedding: vector() });

    const pending = generateEmbedding("a solar install quote");
    await flushMicrotasks();

    expect(mockEmbed).toHaveBeenCalledTimes(1);

    // The first backoff would be 1000ms; `retry-after: 2` must win.
    await vi.advanceTimersByTimeAsync(1_999);
    expect(mockEmbed).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toHaveLength(EMBEDDING_DIMENSIONS);
    expect(mockEmbed).toHaveBeenCalledTimes(2);
  });

  it("exhausts the write-path budget before giving up", async () => {
    mockEmbed.mockRejectedValue(rateLimitError());

    const pending = generateEmbedding("a solar install quote");
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBeNull();
    expect(mockEmbed).toHaveBeenCalledTimes(EMBEDDING_MAX_ATTEMPTS_WRITE);
  });

  it("attempts only once on the retrieval path", async () => {
    mockEmbed.mockRejectedValue(rateLimitError());

    const pending = generateEmbedding("a solar install quote", {
      maxAttempts: EMBEDDING_MAX_ATTEMPTS_READ,
    });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBeNull();
    expect(mockEmbed).toHaveBeenCalledTimes(1);
    expect(EMBEDDING_MAX_ATTEMPTS_READ).toBe(1);
  });

  it("retries a transient server error", async () => {
    mockEmbed
      .mockRejectedValueOnce(providerError("service unavailable", 503))
      .mockResolvedValueOnce({ embedding: vector() });

    const pending = generateEmbedding("a solar install quote");
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toHaveLength(EMBEDDING_DIMENSIONS);
    expect(mockEmbed).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-transient client error", async () => {
    mockEmbed.mockRejectedValue(providerError("invalid request", 400));

    const pending = generateEmbedding("a solar install quote");
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBeNull();
    expect(mockEmbed).toHaveBeenCalledTimes(1);
  });

  it("falls back to the write budget when maxAttempts is not finite", async () => {
    // A NaN budget would otherwise make the exhaustion comparison always false
    // and retry forever.
    mockEmbed.mockRejectedValue(rateLimitError());

    const pending = generateEmbedding("a solar install quote", {
      maxAttempts: Number.NaN,
    });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBeNull();
    expect(mockEmbed).toHaveBeenCalledTimes(EMBEDDING_MAX_ATTEMPTS_WRITE);
  });

  it("recovers the whole slice when a batch retry succeeds", async () => {
    const twentyChunks = Array.from({ length: 20 }, (_, i) => `chunk ${i}`);

    mockEmbedMany
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValueOnce({ embeddings: twentyChunks.map(() => vector()) });

    const pending = generateEmbeddings(twentyChunks);
    await vi.runAllTimersAsync();
    const results = await pending;

    // Before the retry existed, one 429 left all 20 entries null.
    expect(results).toHaveLength(20);
    expect(results.every((entry) => entry !== null)).toBe(true);
    expect(mockEmbedMany).toHaveBeenCalledTimes(2);
  });

  it("logs a structured failure when a slice exhausts its retries", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockEmbedMany.mockRejectedValue(rateLimitError());

    const pending = generateEmbeddings(["first chunk", "second chunk"]);
    await vi.runAllTimersAsync();
    const results = await pending;

    expect(results).toEqual([null, null]);

    const failure = warn.mock.calls
      .map((call) => call[0])
      .filter((arg): arg is string => typeof arg === "string")
      .filter((arg) => arg.startsWith("{"))
      .map((arg) => JSON.parse(arg) as Record<string, unknown>)
      .find((entry) => entry.type === "embedding_batch_failed");

    expect(failure).toMatchObject({
      type: "embedding_batch_failed",
      provider: "gemini",
      statusCode: 429,
      retryable: true,
      attempts: EMBEDDING_MAX_ATTEMPTS_WRITE,
      chunkCount: 2,
    });
  });

  it("does not retry a batch on a non-transient error", async () => {
    mockEmbedMany.mockRejectedValue(providerError("invalid request", 400));

    const pending = generateEmbeddings(["first chunk"]);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual([null]);
    expect(mockEmbedMany).toHaveBeenCalledTimes(1);
  });
});
