import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessMemories } from "@/lib/db/schema/memories";
import {
  generateEmbedding,
  rankBySimilarity,
} from "@/lib/ai/embeddings";

// ---------------------------------------------------------------------------
// Memory RAG Retriever — retrieves semantically relevant business memories
//
// Scoring pipeline:
// 1. Generate query embedding (with cache lookup first)
// 2. Compute cosine similarity for each memory
// 3. Apply keyword boost (+0.1, capped at 1.0)
// 4. Apply recency decay (linear 0–30% over 365 days)
// 5. Apply similarity threshold (0.45, emergency fallback at 0.3)
// 6. Assign confidence tiers (HIGH ≥ 0.7, MEDIUM ≥ 0.55, LOW ≥ 0.45)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RelevantMemory = {
  title: string;
  content: string;
  similarity: number;
};

export interface RetrievedMemory {
  title: string;
  content: string;
  similarity: number;
  confidenceTier: "HIGH" | "MEDIUM" | "LOW";
  category?: string;
}

export interface RetrievalOptions {
  businessId: string;
  queryText: string;
  topK?: number;              // default 3
  categories?: string[];      // optional category filter
  tokenBudget?: number;       // max tokens for combined output
}

export interface RetrievalResult {
  combinedText: string;
  memories: RetrievedMemory[];
  usedRag: boolean;
}

// ---------------------------------------------------------------------------
// Stop words for keyword boost
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "just", "because", "but", "and", "or", "if", "while", "about", "up",
  "it", "its", "i", "me", "my", "we", "our", "you", "your", "he", "him",
  "his", "she", "her", "they", "them", "their", "what", "which", "who",
  "whom", "this", "that", "these", "those", "am",
]);

// ---------------------------------------------------------------------------
// Exported scoring helper functions (testable independently)
// ---------------------------------------------------------------------------

/**
 * Applies keyword boost to a similarity score.
 * Checks for case-insensitive keyword overlap between query and content,
 * ignoring stop words. Boosts by 0.1 if one or more matches found, capped at 1.0.
 */
export function applyKeywordBoost(
  similarity: number,
  query: string,
  content: string,
): number {
  const queryWords = extractKeywords(query);
  const contentLower = content.toLowerCase();

  const hasMatch = queryWords.some((word) => contentLower.includes(word));

  if (hasMatch) {
    return Math.min(similarity + 0.1, 1.0);
  }

  return similarity;
}

/**
 * Applies recency decay to a score based on the memory's updatedAt timestamp.
 * Formula: decayFactor = min(daysSinceUpdate / 365, 1.0) * 0.30
 *          effectiveScore = score * (1 - decayFactor)
 */
export function applyRecencyDecay(score: number, updatedAt: Date): number {
  const now = Date.now();
  const daysSinceUpdate = (now - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.min(daysSinceUpdate / 365, 1.0) * 0.30;
  return score * (1 - decayFactor);
}

/**
 * Assigns a confidence tier based on the effective similarity score.
 * HIGH: >= 0.7, MEDIUM: >= 0.55, LOW: >= 0.45
 */
export function assignConfidenceTier(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.55) return "MEDIUM";
  return "LOW";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts meaningful keywords from text (lowercase, no stop words).
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

// ---------------------------------------------------------------------------
// Token estimation helper
// ---------------------------------------------------------------------------

/** Approximate token count using chars / 4 heuristic. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Unified RAG entry point
// ---------------------------------------------------------------------------

/**
 * Single unified retrieval function supporting both category-filtered and
 * unfiltered retrieval. Applies the full scoring pipeline:
 *
 * embedding cache → similarity → keyword boost → recency decay →
 * threshold → tier labeling → category filter → token budget
 *
 * This is the canonical entry point for all RAG retrieval in the system.
 *
 * @param options - Retrieval options including businessId, queryText, optional topK, categories, and tokenBudget
 * @returns RetrievalResult with combined text, scored memories, and usedRag flag
 */
export async function retrieveMemories(
  options: RetrievalOptions,
): Promise<RetrievalResult> {
  const {
    businessId,
    queryText,
    topK = 3,
    categories,
    tokenBudget,
  } = options;

  const similarityThreshold = 0.45;

  // Load all memories for this business
  const allMemories = await db
    .select({
      title: businessMemories.title,
      content: businessMemories.content,
      embedding: businessMemories.embedding,
      category: businessMemories.category,
      updatedAt: businessMemories.updatedAt,
    })
    .from(businessMemories)
    .where(eq(businessMemories.businessId, businessId))
    .orderBy(asc(businessMemories.position));

  if (allMemories.length === 0) {
    return { combinedText: "", memories: [], usedRag: false };
  }

  // If few memories or no query, return all (no point in filtering)
  if (allMemories.length <= topK || !queryText.trim()) {
    let memories: RetrievedMemory[] = allMemories.map((m) => ({
      title: m.title,
      content: m.content,
      similarity: 1,
      confidenceTier: "HIGH" as const,
      category: m.category,
    }));

    // Apply category filter if specified
    if (categories && categories.length > 0) {
      memories = memories.filter((m) => m.category && categories.includes(m.category));
    }

    // Apply token budget
    if (tokenBudget) {
      memories = applyTokenBudget(memories, tokenBudget);
    }

    const combinedText = memories
      .map((m) => `## ${m.title}\n${m.content}`)
      .join("\n\n");

    return { combinedText, memories, usedRag: false };
  }

  // Check if any memories have embeddings (JSONB null vs actual array)
  const hasEmbeddings = allMemories.some(
    (m) => m.embedding !== null && Array.isArray(m.embedding) && m.embedding.length > 0,
  );

  if (!hasEmbeddings) {
    // Fallback: return all memories (embeddings not generated yet)
    let memories: RetrievedMemory[] = allMemories.map((m) => ({
      title: m.title,
      content: m.content,
      similarity: 1,
      confidenceTier: "HIGH" as const,
      category: m.category,
    }));

    // Apply category filter if specified
    if (categories && categories.length > 0) {
      memories = memories.filter((m) => m.category && categories.includes(m.category));
    }

    // Apply token budget
    if (tokenBudget) {
      memories = applyTokenBudget(memories, tokenBudget);
    }

    const combinedText = memories
      .map((m) => `## ${m.title}\n${m.content}`)
      .join("\n\n");

    return { combinedText, memories, usedRag: false };
  }

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(queryText);

  if (!queryEmbedding) {
    // Embedding generation failed — fallback to all
    let memories: RetrievedMemory[] = allMemories.map((m) => ({
      title: m.title,
      content: m.content,
      similarity: 1,
      confidenceTier: "HIGH" as const,
      category: m.category,
    }));

    // Apply category filter if specified
    if (categories && categories.length > 0) {
      memories = memories.filter((m) => m.category && categories.includes(m.category));
    }

    // Apply token budget
    if (tokenBudget) {
      memories = applyTokenBudget(memories, tokenBudget);
    }

    const combinedText = memories
      .map((m) => `## ${m.title}\n${m.content}`)
      .join("\n\n");

    return { combinedText, memories, usedRag: false };
  }

  // Step 1: Rank memories by cosine similarity (get all for scoring pipeline)
  const ranked = rankBySimilarity(allMemories, queryEmbedding, allMemories.length);

  // Steps 2-4: Apply keyword boost, recency decay, then filter by threshold
  const scored = ranked.map((m) => {
    const boostedScore = applyKeywordBoost(m.similarity, queryText, m.content);
    const effectiveScore = applyRecencyDecay(boostedScore, m.updatedAt);
    return { ...m, effectiveScore };
  });

  // Sort by effective score descending
  scored.sort((a, b) => b.effectiveScore - a.effectiveScore);

  // Step 5: Apply similarity threshold (0.45)
  const passing = scored.filter((m) => m.effectiveScore >= similarityThreshold);

  let results: typeof scored;

  if (passing.length > 0) {
    results = passing.slice(0, topK);
  } else {
    // Emergency fallback: return single highest-scoring memory if > 0.3
    const highest = scored[0];
    if (highest && highest.effectiveScore > 0.3) {
      results = [highest];
    } else {
      return { combinedText: "", memories: [], usedRag: true };
    }
  }

  // Step 6: Assign confidence tiers
  let memoriesWithTiers: RetrievedMemory[] = results.map((m) => ({
    title: m.title,
    content: m.content,
    similarity: m.effectiveScore,
    confidenceTier: assignConfidenceTier(m.effectiveScore),
    category: m.category,
  }));

  // Step 7: Apply category filter if specified
  if (categories && categories.length > 0) {
    memoriesWithTiers = memoriesWithTiers.filter(
      (m) => m.category && categories.includes(m.category),
    );
  }

  // Step 8: Apply token budget
  if (tokenBudget) {
    memoriesWithTiers = applyTokenBudget(memoriesWithTiers, tokenBudget);
  }

  const combinedText = memoriesWithTiers
    .map((m) => `## ${m.title}\n${m.content}`)
    .join("\n\n");

  return {
    combinedText,
    memories: memoriesWithTiers,
    usedRag: true,
  };
}

/**
 * Applies a token budget to a list of memories, truncating the list when
 * the cumulative token count exceeds the budget.
 */
function applyTokenBudget(
  memories: RetrievedMemory[],
  tokenBudget: number,
): RetrievedMemory[] {
  const result: RetrievedMemory[] = [];
  let tokensUsed = 0;

  for (const memory of memories) {
    const entryTokens = estimateTokens(memory.content);
    if (tokensUsed + entryTokens > tokenBudget) {
      break;
    }
    tokensUsed += entryTokens;
    result.push(memory);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Legacy convenience wrapper
// ---------------------------------------------------------------------------

/**
 * Retrieves the most relevant business memories for a given query text.
 * This is a convenience wrapper around the unified `retrieveMemories` function.
 *
 * @param businessId - The business to search memories for
 * @param queryText - The text to find relevant memories for (e.g., user message, inquiry details)
 * @param topK - Maximum number of memories to return (default 3)
 * @param similarityThreshold - Minimum similarity score to include (default 0.45)
 * @returns Formatted text of relevant memories, or all memories if embeddings unavailable
 */
export async function retrieveRelevantMemories({
  businessId,
  queryText,
  topK = 3,
  similarityThreshold = 0.45,
}: {
  businessId: string;
  queryText: string;
  topK?: number;
  similarityThreshold?: number;
}): Promise<{
  combinedText: string;
  memories: RetrievedMemory[];
  usedRag: boolean;
}> {
  // Load all memories for this business
  const allMemories = await db
    .select({
      title: businessMemories.title,
      content: businessMemories.content,
      embedding: businessMemories.embedding,
      category: businessMemories.category,
      updatedAt: businessMemories.updatedAt,
    })
    .from(businessMemories)
    .where(eq(businessMemories.businessId, businessId))
    .orderBy(asc(businessMemories.position));

  if (allMemories.length === 0) {
    return { combinedText: "", memories: [], usedRag: false };
  }

  // If few memories or no query, return all (no point in filtering)
  if (allMemories.length <= topK || !queryText.trim()) {
    const combinedText = allMemories
      .map((m) => `## ${m.title}\n${m.content}`)
      .join("\n\n");

    return {
      combinedText,
      memories: allMemories.map((m) => ({
        title: m.title,
        content: m.content,
        similarity: 1,
        confidenceTier: "HIGH" as const,
        category: m.category,
      })),
      usedRag: false,
    };
  }

  // Check if any memories have embeddings (JSONB null vs actual array)
  const hasEmbeddings = allMemories.some(
    (m) => m.embedding !== null && Array.isArray(m.embedding) && m.embedding.length > 0,
  );

  if (!hasEmbeddings) {
    // Fallback: return all memories (embeddings not generated yet)
    const combinedText = allMemories
      .map((m) => `## ${m.title}\n${m.content}`)
      .join("\n\n");

    return {
      combinedText,
      memories: allMemories.map((m) => ({
        title: m.title,
        content: m.content,
        similarity: 1,
        confidenceTier: "HIGH" as const,
        category: m.category,
      })),
      usedRag: false,
    };
  }

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(queryText);

  if (!queryEmbedding) {
    // Embedding generation failed — fallback to all
    const combinedText = allMemories
      .map((m) => `## ${m.title}\n${m.content}`)
      .join("\n\n");

    return {
      combinedText,
      memories: allMemories.map((m) => ({
        title: m.title,
        content: m.content,
        similarity: 1,
        confidenceTier: "HIGH" as const,
        category: m.category,
      })),
      usedRag: false,
    };
  }

  // Step 1: Rank memories by cosine similarity (get all, not just topK, for scoring pipeline)
  const ranked = rankBySimilarity(allMemories, queryEmbedding, allMemories.length);

  // Steps 2-4: Apply keyword boost, recency decay, then filter by threshold
  const scored = ranked.map((m) => {
    // Step 2: Apply keyword boost
    const boostedScore = applyKeywordBoost(m.similarity, queryText, m.content);

    // Step 3: Apply recency decay
    const effectiveScore = applyRecencyDecay(boostedScore, m.updatedAt);

    return {
      ...m,
      effectiveScore,
    };
  });

  // Sort by effective score descending
  scored.sort((a, b) => b.effectiveScore - a.effectiveScore);

  // Step 4: Apply similarity threshold (0.45)
  const passing = scored.filter((m) => m.effectiveScore >= similarityThreshold);

  let results: typeof scored;

  if (passing.length > 0) {
    // Take top-K from passing memories
    results = passing.slice(0, topK);
  } else {
    // Emergency fallback: return single highest-scoring memory if > 0.3
    const highest = scored[0];
    if (highest && highest.effectiveScore > 0.3) {
      results = [highest];
    } else {
      // Nothing passes even the emergency threshold — return empty
      return { combinedText: "", memories: [], usedRag: true };
    }
  }

  // Step 5: Assign confidence tiers
  const memoriesWithTiers: RetrievedMemory[] = results.map((m) => ({
    title: m.title,
    content: m.content,
    similarity: m.effectiveScore,
    confidenceTier: assignConfidenceTier(m.effectiveScore),
    category: m.category,
  }));

  const combinedText = memoriesWithTiers
    .map((m) => `## ${m.title}\n${m.content}`)
    .join("\n\n");

  return {
    combinedText,
    memories: memoriesWithTiers,
    usedRag: true,
  };
}

/**
 * Generates and stores embeddings for all memories in a business that
 * don't have one yet. Call this when memories are created/updated.
 */
export async function backfillMemoryEmbeddings(businessId: string): Promise<{
  updated: number;
  failed: number;
}> {
  const memoriesWithoutEmbeddings = await db
    .select({
      id: businessMemories.id,
      title: businessMemories.title,
      content: businessMemories.content,
    })
    .from(businessMemories)
    .where(
      and(
        eq(businessMemories.businessId, businessId),
        isNull(businessMemories.embedding),
      ),
    );

  let updated = 0;
  let failed = 0;

  for (const memory of memoriesWithoutEmbeddings) {
    const text = `${memory.title}\n${memory.content}`;
    const embedding = await generateEmbedding(text);

    if (embedding) {
      await db
        .update(businessMemories)
        .set({ embedding, updatedAt: new Date() })
        .where(eq(businessMemories.id, memory.id));
      updated++;
    } else {
      failed++;
    }
  }

  return { updated, failed };
}
