import "server-only";

import { createHash } from "crypto";

import { embed, embedMany } from "ai";
import type { EmbeddingModelV3 } from "@ai-sdk/provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { cacheLayer } from "@/lib/ai/cache-layer";
import { env, isGeminiConfigured } from "@/lib/env";

/**
 * Embedding service for knowledge retrieval.
 *
 * Uses Gemini `gemini-embedding-001` (768 dimensions) through the Vercel AI
 * SDK. Embeddings are cached by content hash for 24 hours to cut cost and
 * latency. Provider failure is non-fatal: callers receive `null` and must
 * fall back to lexical retrieval.
 */

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
export const EMBEDDING_CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const EMBEDDING_CACHE_PREFIX = "embed:";
const MAX_EMBEDDING_INPUT_LENGTH = 20_000;

function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function cacheKeyFor(text: string): string {
  return `${EMBEDDING_CACHE_PREFIX}${contentHash(text)}`;
}

function normalizeInput(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= MAX_EMBEDDING_INPUT_LENGTH) {
    return normalized;
  }

  return normalized.slice(0, MAX_EMBEDDING_INPUT_LENGTH);
}

function getEmbeddingModel(): EmbeddingModelV3 | null {
  if (!isGeminiConfigured) {
    return null;
  }

  try {
    const provider = createGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY,
    });

    return provider.embeddingModel(EMBEDDING_MODEL);
  } catch {
    return null;
  }
}

/**
 * Generates an embedding for a single text. Returns `null` when the provider
 * is unavailable or fails; callers must treat that as a lexical-fallback
 * signal, never as a hard error.
 */
export async function generateEmbedding(
  text: string,
): Promise<number[] | null> {
  const normalized = normalizeInput(text);

  if (!normalized) {
    return null;
  }

  // Content-hash cache (24h): identical text returns the stored embedding.
  try {
    const cached = await cacheLayer.get<number[]>(cacheKeyFor(normalized));
    if (cached && Array.isArray(cached) && cached.length === EMBEDDING_DIMENSIONS) {
      return cached;
    }
  } catch {
    // Cache unavailable — proceed with a fresh embedding.
  }

  const model = getEmbeddingModel();

  if (!model) {
    return null;
  }

  try {
    const { embedding } = await embed({
      model,
      value: normalized,
    });

    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      console.warn(
        `[embeddings] Unexpected embedding dimension (got ${Array.isArray(embedding) ? embedding.length : "none"}).`,
      );
      return null;
    }

    try {
      await cacheLayer.set<number[]>(
        cacheKeyFor(normalized),
        embedding,
        EMBEDDING_CACHE_TTL_SECONDS,
      );
    } catch {
      // Cache write failure is non-fatal.
    }

    return embedding;
  } catch (error) {
    console.warn(
      "[embeddings] Embedding generation failed, falling back to lexical:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Generates embeddings for many texts in one provider call when possible.
 * Each entry is independent: provider failure on one never rejects the batch.
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<Array<number[] | null>> {
  if (texts.length === 0) {
    return [];
  }

  const normalized = texts.map(normalizeInput);

  // Batch cache lookups first.
  const cachedResults: Array<number[] | null> = await Promise.all(
    normalized.map(async (text) => {
      if (!text) {
        return null;
      }

      try {
        const cached = await cacheLayer.get<number[]>(cacheKeyFor(text));
        if (
          cached &&
          Array.isArray(cached) &&
          cached.length === EMBEDDING_DIMENSIONS
        ) {
          return cached;
        }
      } catch {
        // Fall through to generation.
      }

      return undefined as unknown as number[] | null;
    }),
  );

  const missingIndexes: number[] = [];
  for (let index = 0; index < cachedResults.length; index++) {
    if (cachedResults[index] === undefined) {
      missingIndexes.push(index);
    }
  }

  const missingTexts = missingIndexes
    .map((index) => normalized[index])
    .filter((text) => Boolean(text));

  let generated: Array<number[] | null> = [];
  if (missingTexts.length > 0) {
    generated = await generateEmbeddingBatch(missingTexts);
  }

  const results: Array<number[] | null> = [];
  let generatedIndex = 0;
  for (let index = 0; index < normalized.length; index++) {
    const cached = cachedResults[index];
    if (cached === undefined) {
      results.push(generated[generatedIndex] ?? null);
      generatedIndex++;
    } else {
      results.push(cached);
    }
  }

  return results;
}

async function generateEmbeddingBatch(
  texts: string[],
): Promise<Array<number[] | null>> {
  const model = getEmbeddingModel();

  if (!model) {
    return texts.map(() => null);
  }

  // Provider batch limit — keep calls small.
  const BATCH_SIZE = 20;
  const results: Array<number[] | null> = [];

  for (let offset = 0; offset < texts.length; offset += BATCH_SIZE) {
    const slice = texts.slice(offset, offset + BATCH_SIZE);

    try {
      const { embeddings } = await embedMany({
        model,
        values: slice,
        maxParallelCalls: 5,
      });

      for (let index = 0; index < slice.length; index++) {
        const embedding = embeddings[index];
        const valid =
          Array.isArray(embedding) &&
          embedding.length === EMBEDDING_DIMENSIONS;

        if (!valid) {
          results.push(null);
          continue;
        }

        try {
          await cacheLayer.set<number[]>(
            cacheKeyFor(slice[index]),
            embedding,
            EMBEDDING_CACHE_TTL_SECONDS,
          );
        } catch {
          // Cache write failure is non-fatal.
        }

        results.push(embedding);
      }
    } catch (error) {
      console.warn(
        "[embeddings] Batch embedding failed, marking entries null:",
        error instanceof Error ? error.message : error,
      );
      results.push(...slice.map(() => null));
    }
  }

  return results;
}

/**
 * Invalidates the cached embedding for a text (e.g. after content changes).
 */
export async function invalidateEmbeddingCache(text: string): Promise<void> {
  const normalized = normalizeInput(text);

  if (!normalized) {
    return;
  }

  try {
    await cacheLayer.delete(cacheKeyFor(normalized));
  } catch {
    // Cache invalidation failure is non-fatal.
  }
}

/**
 * Cosine similarity between two embedding vectors. Returns 0 for empty or
 * mismatched inputs so callers can treat it as "no signal".
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
