import { and, eq, lte } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { aiDrafts, inquiries, quotes } from "@/lib/db/schema";
import type { AiTaskType } from "@/features/ai/task-registry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiDraftRow = typeof aiDrafts.$inferSelect;

export type SaveDraftParams = {
  businessId: string;
  userId: string;
  entityId: string;
  entityType: "inquiry" | "quote";
  taskType: AiTaskType;
  content: Record<string, unknown>;
  sourceDataTimestamp: Date;
};

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Retrieves a draft by entityId and taskType.
 * Updates `lastAccessedAt` on access and checks staleness against the source
 * entity's `updatedAt` timestamp.
 */
export async function getDraft(
  entityId: string,
  taskType: AiTaskType,
): Promise<AiDraftRow | null> {
  const [draft] = await db
    .select()
    .from(aiDrafts)
    .where(and(eq(aiDrafts.entityId, entityId), eq(aiDrafts.taskType, taskType)))
    .limit(1);

  if (!draft) {
    return null;
  }

  const now = new Date();

  // Update lastAccessedAt
  await db
    .update(aiDrafts)
    .set({ lastAccessedAt: now })
    .where(eq(aiDrafts.id, draft.id));

  // Check staleness against source entity updatedAt
  let sourceUpdatedAt: Date | null = null;

  if (draft.entityType === "inquiry") {
    const [entity] = await db
      .select({ updatedAt: inquiries.updatedAt })
      .from(inquiries)
      .where(eq(inquiries.id, entityId))
      .limit(1);

    sourceUpdatedAt = entity?.updatedAt ?? null;
  } else if (draft.entityType === "quote") {
    const [entity] = await db
      .select({ updatedAt: quotes.updatedAt })
      .from(quotes)
      .where(eq(quotes.id, entityId))
      .limit(1);

    sourceUpdatedAt = entity?.updatedAt ?? null;
  }

  // Mark stale if source entity was updated after the draft was generated
  const isStale =
    sourceUpdatedAt !== null &&
    sourceUpdatedAt.getTime() > draft.sourceDataTimestamp.getTime();

  if (isStale && !draft.isStale) {
    await db
      .update(aiDrafts)
      .set({ isStale: true, updatedAt: now })
      .where(eq(aiDrafts.id, draft.id));
  }

  return {
    ...draft,
    lastAccessedAt: now,
    isStale: isStale || draft.isStale,
  };
}

/**
 * Upserts a draft — only one draft per (entityId, taskType) exists at any time.
 * Uses the unique index `ai_drafts_entity_task_unique` for conflict resolution.
 */
export async function saveDraft(params: SaveDraftParams): Promise<AiDraftRow> {
  const now = new Date();
  const id = crypto.randomUUID();

  const [draft] = await db
    .insert(aiDrafts)
    .values({
      id,
      businessId: params.businessId,
      userId: params.userId,
      entityId: params.entityId,
      entityType: params.entityType,
      taskType: params.taskType,
      content: params.content,
      sourceDataTimestamp: params.sourceDataTimestamp,
      isStale: false,
      lastAccessedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [aiDrafts.entityId, aiDrafts.taskType],
      set: {
        businessId: params.businessId,
        userId: params.userId,
        entityType: params.entityType,
        content: params.content,
        sourceDataTimestamp: params.sourceDataTimestamp,
        isStale: false,
        lastAccessedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  return draft;
}

/**
 * Marks a draft as stale for the given entity + task type.
 */
export async function markDraftStale(
  entityId: string,
  taskType: AiTaskType,
): Promise<void> {
  await db
    .update(aiDrafts)
    .set({ isStale: true, updatedAt: new Date() })
    .where(and(eq(aiDrafts.entityId, entityId), eq(aiDrafts.taskType, taskType)));
}

/**
 * Removes all drafts for a given entity.
 */
export async function deleteDraftsForEntity(entityId: string): Promise<void> {
  await db.delete(aiDrafts).where(eq(aiDrafts.entityId, entityId));
}

/**
 * Deletes drafts with `lastAccessedAt` older than the specified number of days.
 * Defaults to 90 days.
 * Returns the number of deleted drafts.
 */
export async function cleanupExpiredDrafts(
  olderThanDays: number = 90,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const deleted = await db
    .delete(aiDrafts)
    .where(lte(aiDrafts.lastAccessedAt, cutoffDate))
    .returning({ id: aiDrafts.id });

  return deleted.length;
}
