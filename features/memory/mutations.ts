"server only";

import { and, count, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessMemories } from "@/lib/db/schema/memories";
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

  const [created] = await db
    .insert(businessMemories)
    .values({
      id: crypto.randomUUID(),
      businessId,
      title: memory.title,
      content: memory.content,
      position: nextPosition,
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
  const [updated] = await db
    .update(businessMemories)
    .set({
      title: memory.title,
      content: memory.content,
      updatedAt: new Date(),
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
