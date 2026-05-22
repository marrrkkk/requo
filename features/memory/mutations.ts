"server only";

import { and, count, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessMemories } from "@/lib/db/schema/memories";
import { generateEmbedding } from "@/lib/ai/embeddings";
import type { MemoryInput } from "@/features/memory/schemas";

export async function createMemoryForBusiness({
  businessId,
  actorUserId: _actorUserId,
  memory,
}: {
  businessId: string;
  actorUserId: string;
  memory: MemoryInput;
}) {
  const maxPositionResult = await db
    .select({
      maxPosition: sql<number>`max(${businessMemories.position})`,
    })
    .from(businessMemories)
    .where(eq(businessMemories.businessId, businessId));

  const nextPosition = (maxPositionResult[0]?.maxPosition ?? -1) + 1;

  // Generate embedding in background (non-blocking for the create)
  const embeddingText = `${memory.title}\n${memory.content}`;
  const embedding = await generateEmbedding(embeddingText).catch(() => null);

  const [created] = await db
    .insert(businessMemories)
    .values({
      id: crypto.randomUUID(),
      businessId,
      title: memory.title,
      content: memory.content,
      position: nextPosition,
      embedding,
    })
    .returning();

  return created;
}

export async function updateMemoryForBusiness({
  businessId,
  actorUserId: _actorUserId,
  memoryId,
  memory,
}: {
  businessId: string;
  actorUserId: string;
  memoryId: string;
  memory: MemoryInput;
}) {
  // Regenerate embedding on content change
  const embeddingText = `${memory.title}\n${memory.content}`;
  const embedding = await generateEmbedding(embeddingText).catch(() => null);

  const [updated] = await db
    .update(businessMemories)
    .set({
      title: memory.title,
      content: memory.content,
      updatedAt: new Date(),
      embedding,
    })
    .where(
      and(
        eq(businessMemories.id, memoryId),
        eq(businessMemories.businessId, businessId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function deleteMemoryForBusiness({
  businessId,
  actorUserId: _actorUserId,
  memoryId,
}: {
  businessId: string;
  actorUserId: string;
  memoryId: string;
}) {
  const [deleted] = await db
    .delete(businessMemories)
    .where(
      and(
        eq(businessMemories.id, memoryId),
        eq(businessMemories.businessId, businessId),
      ),
    )
    .returning();

  return deleted ?? null;
}

export async function getMemoryCountForBusiness(businessId: string) {
  const [result] = await db
    .select({
      count: count(businessMemories.id),
    })
    .from(businessMemories)
    .where(eq(businessMemories.businessId, businessId));

  return result?.count ?? 0;
}
