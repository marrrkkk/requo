import "server-only";

import { retrieveMemories as unifiedRetrieveMemories } from "@/features/memory/rag-retriever";
import type { MemoryCategory, RetrievedMemory } from "./types";

// ---------------------------------------------------------------------------
// Memory Retriever — orchestrator-level wrapper that delegates to the unified
// RAG retriever in features/memory/rag-retriever.ts.
//
// Provides category-filtered retrieval with an 800-token budget for the
// orchestration pipeline.
// ---------------------------------------------------------------------------

const TOP_K = 5;
const TOKEN_BUDGET = 800;

/**
 * Retrieves business memories relevant to a user message, filtered by
 * memory categories from intent classification.
 *
 * Delegates to the unified RAG retriever which applies the full scoring
 * pipeline: embedding → similarity → keyword boost → recency decay →
 * threshold → tier labeling → category filter → token budget.
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
    const result = await unifiedRetrieveMemories({
      businessId,
      queryText: message,
      topK: TOP_K,
      categories,
      tokenBudget: TOKEN_BUDGET,
    });

    // Map unified RetrievedMemory to orchestrator RetrievedMemory format
    return result.memories.map((m) => ({
      id: `${businessId}:${m.title}`, // Synthetic ID for orchestrator compatibility
      content: m.content,
      category: (m.category ?? "business_rules") as MemoryCategory,
      similarity: m.similarity,
      confidenceTier: m.confidenceTier,
    }));
  } catch (error) {
    // Gracefully handle errors (e.g., missing column/migration not applied)
    console.warn(
      "[memory-retriever] Failed to retrieve memories, returning empty:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
