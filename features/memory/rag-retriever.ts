import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessMemories } from "@/lib/db/schema/memories";
import {
  generateEmbedding,
  rankBySimilarity,
} from "@/lib/ai/embeddings";

// ---------------------------------------------------------------------------
// Memory RAG Retriever — retrieves semantically relevant business memories
//
// Instead of loading ALL memories into the AI context (which wastes tokens
// when only 1-2 are relevant), this retriever:
// 1. Generates an embedding for the user's query/context
// 2. Loads all memories for the business (typically < 20)
// 3. Ranks by cosine similarity
// 4. Returns only the top-K most relevant entries
//
// Falls back to loading all memories if embeddings aren't available.
// ---------------------------------------------------------------------------

export type RelevantMemory = {
  title: string;
  content: string;
  similarity: number;
};

/**
 * Retrieves the most relevant business memories for a given query text.
 *
 * @param businessId - The business to search memories for
 * @param queryText - The text to find relevant memories for (e.g., user message, inquiry details)
 * @param topK - Maximum number of memories to return (default 3)
 * @param similarityThreshold - Minimum similarity score to include (default 0.3)
 * @returns Formatted text of relevant memories, or all memories if embeddings unavailable
 */
export async function retrieveRelevantMemories({
  businessId,
  queryText,
  topK = 3,
  similarityThreshold = 0.3,
}: {
  businessId: string;
  queryText: string;
  topK?: number;
  similarityThreshold?: number;
}): Promise<{
  combinedText: string;
  memories: RelevantMemory[];
  usedRag: boolean;
}> {
  // Load all memories for this business
  const allMemories = await db
    .select({
      title: businessMemories.title,
      content: businessMemories.content,
      embedding: businessMemories.embedding,
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
      })),
      usedRag: false,
    };
  }

  // Rank memories by similarity
  const ranked = rankBySimilarity(allMemories, queryEmbedding, topK)
    .filter((m) => m.similarity >= similarityThreshold);

  // If nothing passes threshold, return top-1 anyway
  const results = ranked.length > 0
    ? ranked
    : rankBySimilarity(allMemories, queryEmbedding, 1);

  const combinedText = results
    .map((m) => `## ${m.title}\n${m.content}`)
    .join("\n\n");

  return {
    combinedText,
    memories: results.map((m) => ({
      title: m.title,
      content: m.content,
      similarity: m.similarity,
    })),
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
    .where(eq(businessMemories.businessId, businessId));

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
