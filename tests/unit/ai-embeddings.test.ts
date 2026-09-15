import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression coverage for the dimensionality contract.
 *
 * Gemini embedding models are Matryoshka: they answer with 3072 dimensions
 * unless the request asks for 768. The module discards anything that is not
 * 768, and does so with a warning and a `null` return rather than an error —
 * so a missing `outputDimensionality` silently disables semantic retrieval
 * instead of surfacing a failure. These tests pin both halves: the request
 * carries the dimensionality, and the guard still rejects the wrong size.
 */

const mockEmbed = vi.fn();
const mockEmbedMany = vi.fn();
const mockEmbeddingModel = vi.fn((id: string) => ({ provider: "google", modelId: id }));

vi.mock("ai", () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
  embedMany: (...args: unknown[]) => mockEmbedMany(...args),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => ({
    embeddingModel: (id: string) => mockEmbeddingModel(id),
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
  EMBEDDING_MODEL,
  generateEmbedding,
  generateEmbeddings,
} from "@/lib/ai/embeddings";

const EXPECTED_DIMENSIONALITY = { google: { outputDimensionality: 768 } };

function vector(length: number): number[] {
  return Array.from({ length }, () => 0.01);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("embedding dimensionality", () => {
  it("asks the provider for 768 dimensions on a single embedding", async () => {
    mockEmbed.mockResolvedValue({ embedding: vector(EMBEDDING_DIMENSIONS) });

    const result = await generateEmbedding("a solar install quote");

    expect(result).not.toBeNull();
    expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(mockEmbed).toHaveBeenCalledTimes(1);
    expect(mockEmbed.mock.calls[0][0]).toMatchObject({
      providerOptions: EXPECTED_DIMENSIONALITY,
    });
  });

  it("asks the provider for 768 dimensions on a batch", async () => {
    mockEmbedMany.mockResolvedValue({
      embeddings: [vector(EMBEDDING_DIMENSIONS), vector(EMBEDDING_DIMENSIONS)],
    });

    const results = await generateEmbeddings(["first chunk", "second chunk"]);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r?.length === EMBEDDING_DIMENSIONS)).toBe(true);
    expect(mockEmbedMany).toHaveBeenCalledTimes(1);
    expect(mockEmbedMany.mock.calls[0][0]).toMatchObject({
      providerOptions: EXPECTED_DIMENSIONALITY,
    });
  });

  it("uses the catalog-independent Gemini embedding identifier", async () => {
    mockEmbed.mockResolvedValue({ embedding: vector(EMBEDDING_DIMENSIONS) });

    await generateEmbedding("anything");

    expect(mockEmbeddingModel).toHaveBeenCalledWith(EMBEDDING_MODEL);
    expect(EMBEDDING_MODEL).toBe("gemini-embedding-001");
  });

  it("still rejects the provider's default 3072-dimension vector", async () => {
    // The exact response the API returns when the request omits
    // `outputDimensionality`. Returning null here is what made the omission
    // silent, so the guard itself is part of the contract under test.
    mockEmbed.mockResolvedValue({ embedding: vector(3072) });

    await expect(generateEmbedding("a solar install quote")).resolves.toBeNull();
  });

  it("rejects a mismatched batch entry without rejecting the batch", async () => {
    mockEmbedMany.mockResolvedValue({
      embeddings: [vector(EMBEDDING_DIMENSIONS), vector(3072)],
    });

    const results = await generateEmbeddings(["good chunk", "bad chunk"]);

    expect(results[0]).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(results[1]).toBeNull();
  });

  it("returns null rather than throwing when the provider fails", async () => {
    mockEmbed.mockRejectedValue(new Error("upstream unavailable"));

    await expect(generateEmbedding("a solar install quote")).resolves.toBeNull();
  });

  it("does not call the provider for blank input", async () => {
    await expect(generateEmbedding("   ")).resolves.toBeNull();
    expect(mockEmbed).not.toHaveBeenCalled();
  });
});
