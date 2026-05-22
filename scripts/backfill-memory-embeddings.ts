/**
 * Backfill script: generates embeddings for all business memories that
 * don't have one yet. Run after adding the embedding column.
 *
 * Usage:
 *   npm run db:backfill-memory-embeddings
 *
 * Requires GEMINI_API_KEY to be configured.
 */

import "dotenv/config";

import { eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessMemories } from "@/lib/db/schema/memories";
import { businesses } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/ai/embeddings";

async function main() {
  console.log("[backfill] Starting memory embedding backfill...");

  // Get all businesses that have memories without embeddings
  // Note: the embedding column defaults to JSON null (not SQL NULL),
  // so we check for both SQL NULL and JSON null value
  const businessIds = await db
    .selectDistinct({ businessId: businessMemories.businessId })
    .from(businessMemories)
    .where(
      sql`${businessMemories.embedding} IS NULL OR ${businessMemories.embedding} = 'null'::jsonb`,
    );

  console.log(
    `[backfill] Found ${businessIds.length} businesses with un-embedded memories.`,
  );

  let totalUpdated = 0;
  let totalFailed = 0;

  for (const { businessId } of businessIds) {
    const memories = await db
      .select({
        id: businessMemories.id,
        title: businessMemories.title,
        content: businessMemories.content,
      })
      .from(businessMemories)
      .where(
        sql`${businessMemories.businessId} = ${businessId} AND (${businessMemories.embedding} IS NULL OR ${businessMemories.embedding} = 'null'::jsonb)`,
      );

    console.log(
      `[backfill] Processing business ${businessId}: ${memories.length} memories`,
    );

    for (const memory of memories) {
      const text = `${memory.title}\n${memory.content}`;
      const embedding = await generateEmbedding(text);

      if (embedding) {
        await db
          .update(businessMemories)
          .set({ embedding, updatedAt: new Date() })
          .where(eq(businessMemories.id, memory.id));
        totalUpdated++;
      } else {
        totalFailed++;
        console.warn(
          `[backfill] Failed to generate embedding for memory ${memory.id}`,
        );
      }

      // Small delay to avoid rate limiting the embedding API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(
    `[backfill] Done. Updated: ${totalUpdated}, Failed: ${totalFailed}`,
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("[backfill] Fatal error:", error);
  process.exit(1);
});
