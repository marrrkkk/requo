import "server-only";

import { createHash } from "crypto";

import { embed } from "ai";

import { cacheLayer } from "@/lib/ai/cache-layer";
import { google, mistral, nvidia } from "@/lib/ai/registry";

// ---------------------------------------------------------------------------
// Embeddings — lightweight semantic similarity for memory retrieval
//
// Uses embedding models with fallback to handle quota/rate-limit errors.
// Primary: Gemini embedding (768 dimensions, free tier)
// Fallback: NVIDIA NIM embeddings (Matryoshka, supports 768-dim truncation)
// Fallback: Mistral embed (1024 dimensions — truncated to match stored 768-dim vectors)
//
// Similarity is computed using cosine similarity on the application side.
// For the small number of memories per business (< 20 typical), this is
// fast enough without a vector index.
// ---------------------------------------------------------------------------

/** Embedding model configs in priority order */
const EMBEDDING_MODELS = [
  { provider: "google" as const, model: "gemini-embedding-001", dimensions: 768 },
  { provider: "google" as const, model: "text-embedding-004", dimensions: 768 },
  { provider: "nvidia" as const, model: "nvidia/llama-3.2-nv-embedqa-1b-v2", dimensions: 768 },
  { provider: "nvidia" as const, model: "nvidia/nv-embedqa-e5-v5", dimensions: 1024 },
  { provider: "nvidia" as const, model: "nvidia/embed-qa-4", dimensions: 1024 },
  { provider: "mistral" as const, model: "mistral-embed", dimensions: 1024 },
] as const;

/** Target dimensions for stored embeddings */
const TARGET_DIMENSIONS = 768;

/** TTL for cached embeddings (5 minutes) */
const EMBEDDING_CACHE_TTL_SECONDS = 300;

/**
 * Generates a cache key for an embedding based on SHA-256 hash of the input text.
 */
function embeddingCacheKey(text: string): string {
  const hash = createHash("sha256").update(text).digest("hex");
  return `emb:${hash}`;
}

/**
 * Generates an embedding vector for the given text.
 * Checks the cache first; on miss, tries multiple providers in order.
 * Caches successful results with a 300-second TTL.
 * Returns null if all providers fail.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Check cache first
  const cacheKey = embeddingCacheKey(text);
  try {
    const cached = await cacheLayer.get<number[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  } catch {
    // Cache read failure is non-fatal — proceed to generate
  }

  // Generate embedding from providers
  const embedding = await generateEmbeddingFromProviders(text);

  // Cache successful result
  if (embedding !== null) {
    try {
      await cacheLayer.set(cacheKey, embedding, EMBEDDING_CACHE_TTL_SECONDS);
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return embedding;
}

/**
 * Generates an embedding vector by trying multiple providers in order.
 * Returns null if all fail.
 */
async function generateEmbeddingFromProviders(text: string): Promise<number[] | null> {
  for (const config of EMBEDDING_MODELS) {
    try {
      if (config.provider === "google" && google) {
        const result = await embed({
          model: google.textEmbeddingModel(config.model),
          value: text,
        });
        return normalizeToTargetDimensions(result.embedding, config.dimensions);
      }

      if (config.provider === "nvidia" && nvidia) {
        const result = await embed({
          model: nvidia.textEmbeddingModel(config.model),
          value: text,
        });
        return normalizeToTargetDimensions(result.embedding, config.dimensions);
      }

      if (config.provider === "mistral" && mistral) {
        const result = await embed({
          model: mistral.textEmbeddingModel(config.model),
          value: text,
        });
        return normalizeToTargetDimensions(result.embedding, config.dimensions);
      }
    } catch (error) {
      console.warn(
        `[embeddings] ${config.provider}/${config.model} failed, trying next:`,
        error instanceof Error ? error.message : error,
      );
      continue;
    }
  }

  // All providers failed
  console.warn("[embeddings] All embedding providers failed, returning null");
  return null;
}

/**
 * Normalizes embedding to target dimensions.
 * If source has more dimensions, truncates. If fewer, pads with zeros.
 * Truncation is valid for models trained with Matryoshka representation learning.
 */
function normalizeToTargetDimensions(embedding: number[], sourceDimensions: number): number[] {
  if (sourceDimensions === TARGET_DIMENSIONS) {
    return embedding;
  }

  if (embedding.length > TARGET_DIMENSIONS) {
    return embedding.slice(0, TARGET_DIMENSIONS);
  }

  // Pad with zeros (unlikely path)
  const padded = [...embedding];
  while (padded.length < TARGET_DIMENSIONS) {
    padded.push(0);
  }
  return padded;
}

/**
 * Computes cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical, 0 = orthogonal).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Ranks items by similarity to a query embedding.
 * Returns items sorted by descending similarity with their scores.
 */
export function rankBySimilarity<T extends { embedding: number[] | null }>(
  items: T[],
  queryEmbedding: number[],
  topK: number,
): Array<T & { similarity: number }> {
  const scored = items
    .filter((item): item is T & { embedding: number[] } => item.embedding !== null)
    .map((item) => ({
      ...item,
      similarity: cosineSimilarity(item.embedding, queryEmbedding),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, topK);
}
