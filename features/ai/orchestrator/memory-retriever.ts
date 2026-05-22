import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessMemories } from "@/lib/db/schema/memories";
import {
  generateEmbedding,
  rankBySimilarity,
} from "@/lib/ai/embeddings";
import type { MemoryCategory, RetrievedMemory } from "./types";

// ---------------------------------------------------------------------------
// Memory Retriever — retrieves semantically relevant business memories
// filtered by category for the orchestration pipeline.
//
// Uses the same embedding infrastructure as the existing rag-retriever but
// scoped to specific memory categories identified by intent classification.
// Applies an 800-token budget to avoid bloating the prompt.
// ---------------------------------------------------------------------------

const SIMILARITY_THRESHOLD = 0.4;
const TOP_K = 5;
const TOKEN_BUDGET = 800;

/** Approximate token count using chars / 4 heuristic. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Retrieves business memories relevant to a user message, filtered by
 * memory categories from intent classification.
 *
 * Returns entries ranked by cosine similarity, capped at 5 entries with
 * similarity > 0.4, and bounded by an 800-token budget.
 */
export async function retrieveMemories(
  message: string,
  businessId: string,
  categories: MemoryCategory[],
): Promise<RetrievedMemory[]> {
  // Return early if no categories requested
  if (categories.length === 0) {
    return [];
  }

  try {
    // Generate embedding for the user message
    const queryEmbedding = await generateEmbedding(message);

    if (!queryEmbedding) {
      return [];
    }

    // Query memories filtered by businessId and category
    const memories = await db
      .select({
        id: businessMemories.id,
        content: businessMemories.content,
        category: businessMemories.category,
        embedding: businessMemories.embedding,
      })
      .from(businessMemories)
      .where(
        and(
          eq(businessMemories.businessId, businessId),
          inArray(businessMemories.category, categories),
        ),
      );

    if (memories.length === 0) {
      return [];
    }

    // Rank by cosine similarity, take top 5
    const ranked = rankBySimilarity(memories, queryEmbedding, TOP_K).filter(
      (m) => m.similarity >= SIMILARITY_THRESHOLD,
    );

    if (ranked.length === 0) {
      return [];
    }

    // Apply 800-token budget in descending similarity order
    const results: RetrievedMemory[] = [];
    let tokensUsed = 0;

    for (const entry of ranked) {
      const entryTokens = estimateTokens(entry.content);
      if (tokensUsed + entryTokens > TOKEN_BUDGET) {
        break;
      }
      tokensUsed += entryTokens;
      results.push({
        id: entry.id,
        content: entry.content,
        category: entry.category as MemoryCategory,
        similarity: entry.similarity,
      });
    }

    return results;
  } catch (error) {
    // Gracefully handle DB errors (e.g., missing column/migration not applied)
    console.warn(
      "[memory-retriever] Failed to retrieve memories, returning empty:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
