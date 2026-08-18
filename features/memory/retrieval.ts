import "server-only";

import { and, eq } from "drizzle-orm";

import { cosineSimilarity, generateEmbedding } from "@/lib/ai/embeddings";
import { db } from "@/lib/db/client";
import {
  businessKnowledgeChunks,
  businessKnowledgeFiles,
  businessMemories,
} from "@/lib/db/schema";
import type { BusinessMemoryCategory } from "@/lib/db/schema/memories";

/**
 * Hybrid knowledge retriever for AI quote generation.
 *
 * Retrieval is business-scoped and context-only: evidence may shape wording,
 * scope, exclusions, and clarification questions, but it is never monetary
 * authority. Returns empty evidence for empty knowledge, a blank query, a
 * failed embedding, or when no candidate clears the conservative threshold.
 */

export type KnowledgeEvidence = {
  sourceType: "manual_memory" | "uploaded_file";
  sourceId: string;
  chunkId: string;
  title: string;
  content: string;
  score: number;
  confidence: "high" | "medium" | "low";
};

export type KnowledgeRetrievalResult = {
  evidence: KnowledgeEvidence[];
  usedRag: boolean;
};

export const KNOWLEDGE_TOP_K = 6;
export const KNOWLEDGE_TOKEN_BUDGET = 1_800;
export const KNOWLEDGE_CHARS_PER_TOKEN = 4;

const COMBINED_SCORE_THRESHOLD = 0.26;
const COSINE_FLOOR = 0.16;
const LEXICAL_ONLY_MIN_TERMS = 2;
const COSINE_WEIGHT = 0.65;
const LEXICAL_WEIGHT = 0.35;

type ScoredCandidate = {
  evidence: KnowledgeEvidence;
  cosineScore: number;
  lexicalScore: number;
};

function significantTerms(query: string): string[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4);

  return Array.from(new Set(terms));
}

function lexicalScore(content: string, terms: string[]): number {
  if (terms.length === 0) {
    return 0;
  }

  const normalizedContent = content.toLowerCase();
  const matched = terms.filter((term) =>
    normalizedContent.includes(term),
  ).length;

  return matched / terms.length;
}

function mapConfidence(score: number): KnowledgeEvidence["confidence"] {
  if (score >= 0.5) {
    return "high";
  }

  if (score >= 0.34) {
    return "medium";
  }

  return "low";
}

function estimateCharsForBudget(tokenBudget: number): number {
  return tokenBudget * KNOWLEDGE_CHARS_PER_TOKEN;
}

/**
 * Retrieves business knowledge relevant to a query using hybrid scoring:
 * cosine similarity over embeddings when available, combined with a lexical
 * keyword boost. Fail-safe by design — any failure path yields empty evidence.
 */
export async function retrieveBusinessKnowledge(input: {
  businessId: string;
  queryText: string;
  topK?: number;
  tokenBudget?: number;
  categories?: BusinessMemoryCategory[];
}): Promise<KnowledgeRetrievalResult> {
  const query = input.queryText.trim();

  if (!query) {
    return { evidence: [], usedRag: false };
  }

  const topK = Math.min(input.topK ?? KNOWLEDGE_TOP_K, 10);
  const tokenBudget = input.tokenBudget ?? KNOWLEDGE_TOKEN_BUDGET;

  // Load sources in parallel: manual memories (optionally category-filtered)
  // and chunks from ready files only.
  const [memories, fileChunks] = await Promise.all([
    db
      .select({
        id: businessMemories.id,
        title: businessMemories.title,
        content: businessMemories.content,
        embedding: businessMemories.embedding,
      })
      .from(businessMemories)
      .where(
        and(
          eq(businessMemories.businessId, input.businessId),
          ...(input.categories?.length
            ? [eq(businessMemories.category, input.categories[0])]
            : []),
        ),
      ),
    db
      .select({
        chunkId: businessKnowledgeChunks.id,
        fileId: businessKnowledgeChunks.fileId,
        content: businessKnowledgeChunks.content,
        embedding: businessKnowledgeChunks.embedding,
        fileName: businessKnowledgeFiles.originalFileName,
      })
      .from(businessKnowledgeChunks)
      .innerJoin(
        businessKnowledgeFiles,
        eq(businessKnowledgeChunks.fileId, businessKnowledgeFiles.id),
      )
      .where(
        and(
          eq(businessKnowledgeChunks.businessId, input.businessId),
          eq(businessKnowledgeFiles.status, "ready"),
        ),
      ),
  ]);

  if (memories.length === 0 && fileChunks.length === 0) {
    return { evidence: [], usedRag: false };
  }

  const candidates: Array<{
    sourceType: KnowledgeEvidence["sourceType"];
    sourceId: string;
    chunkId: string;
    title: string;
    content: string;
    embedding: number[] | null;
  }> = [];

  for (const memory of memories) {
    candidates.push({
      sourceType: "manual_memory",
      sourceId: memory.id,
      chunkId: memory.id,
      title: memory.title,
      content: memory.content,
      embedding: memory.embedding,
    });
  }

  for (const chunk of fileChunks) {
    candidates.push({
      sourceType: "uploaded_file",
      sourceId: chunk.fileId,
      chunkId: chunk.chunkId,
      title: chunk.fileName,
      content: chunk.content,
      embedding: chunk.embedding,
    });
  }

  // Query embedding is best-effort; lexical retrieval must always work.
  const queryEmbedding = await generateEmbedding(query).catch(() => null);

  const terms = significantTerms(query);
  const scored: ScoredCandidate[] = [];

  for (const candidate of candidates) {
    const cosine =
      queryEmbedding && candidate.embedding
        ? cosineSimilarity(queryEmbedding, candidate.embedding)
        : 0;
    const lexical = lexicalScore(candidate.content, terms);

    // Lexical-only fallback: require several distinctive terms to match.
    if (!queryEmbedding) {
      const matchedTerms = terms.filter((term) =>
        candidate.content.toLowerCase().includes(term),
      ).length;

      if (matchedTerms < LEXICAL_ONLY_MIN_TERMS) {
        continue;
      }
    }

    const combined =
      cosine * COSINE_WEIGHT + lexical * LEXICAL_WEIGHT;

    if (combined < COMBINED_SCORE_THRESHOLD) {
      continue;
    }

    if (queryEmbedding && cosine < COSINE_FLOOR) {
      continue;
    }

    scored.push({
      evidence: {
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        chunkId: candidate.chunkId,
        title: candidate.title,
        content: candidate.content,
        score: combined,
        confidence: mapConfidence(combined),
      },
      cosineScore: cosine,
      lexicalScore: lexical,
    });
  }

  if (scored.length === 0) {
    return { evidence: [], usedRag: false };
  }

  // Rank by combined score, then apply the token budget.
  scored.sort((a, b) => b.evidence.score - a.evidence.score);

  const budgetChars = estimateCharsForBudget(tokenBudget);
  const selected: KnowledgeEvidence[] = [];
  let usedChars = 0;

  for (const candidate of scored) {
    if (selected.length >= topK) {
      break;
    }

    const contentChars = candidate.evidence.content.length + 40; // title + framing

    if (usedChars + contentChars > budgetChars) {
      break;
    }

    selected.push(candidate.evidence);
    usedChars += contentChars;
  }

  return {
    evidence: selected,
    usedRag: selected.length > 0,
  };
}

/**
 * Formats retrieved evidence for a prompt, keeping source/chunk IDs attached
 * so the final draft can cite the exact evidence used.
 */
export function formatKnowledgeEvidence(
  evidence: KnowledgeEvidence[],
): string {
  if (evidence.length === 0) {
    return "- No saved business knowledge.";
  }

  return evidence
    .map(
      (entry) =>
        `- [${entry.sourceType === "manual_memory" ? "Memory" : "File"}: "${entry.title}" (source:${entry.sourceId}, chunk:${entry.chunkId}, confidence:${entry.confidence})]\n  ${entry.content.slice(0, 1200)}`,
    )
    .join("\n\n");
}