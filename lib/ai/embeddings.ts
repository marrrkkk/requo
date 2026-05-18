import "server-only";

import { embed } from "ai";

import { google } from "@/lib/ai/registry";

// ---------------------------------------------------------------------------
// Embeddings — lightweight semantic similarity for memory retrieval
//
// Uses Gemini's text-embedding model (free tier, 768 dimensions) to generate
// embeddings for business memory entries. Stored as JSONB arrays in Postgres
// to avoid requiring pgvector extension.
//
// Similarity is computed using cosine similarity on the application side.
// For the small number of memories per business (< 20 typical), this is
// fast enough without a vector index.
// ---------------------------------------------------------------------------

const EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * Generates an embedding vector for the given text.
 * Returns null if the embedding provider is not configured.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!google) {
    return null;
  }

  try {
    const result = await embed({
      model: google.textEmbeddingModel(EMBEDDING_MODEL),
      value: text,
    });

    return result.embedding;
  } catch (error) {
    console.warn(
      "[embeddings] Failed to generate embedding:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
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
