import "server-only";

import { and, count, eq } from "drizzle-orm";
import { updateTag } from "next/cache";

import { getBusinessMemoryCacheTags } from "@/lib/cache/business-tags";
import type {
  MemoryEntryInput,
  MemoryEntryUpdate,
} from "@/features/memory/schemas";
import { db } from "@/lib/db/client";
import { businessMemories } from "@/lib/db/schema";
import {
  generateEmbedding,
  invalidateEmbeddingCache,
} from "@/lib/ai/embeddings";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function memoryEmbeddingText(title: string, content: string) {
  return `${title}\n${content}`;
}

function invalidateKnowledgeCache(businessId: string) {
  for (const tag of getBusinessMemoryCacheTags(businessId)) {
    updateTag(tag);
  }
}

export async function createBusinessMemory({
  businessId,
  entry,
}: {
  businessId: string;
  entry: MemoryEntryInput;
}) {
  const [countRow] = await db
    .select({ total: count() })
    .from(businessMemories)
    .where(eq(businessMemories.businessId, businessId));

  const id = createId("mem");

  // Embedding generation is best-effort: a null embedding is stored and
  // retrieval falls back to lexical matching. The entry itself must persist.
  const embedding = await generateEmbedding(
    memoryEmbeddingText(entry.title, entry.content),
  );

  await db.insert(businessMemories).values({
    id,
    businessId,
    title: entry.title,
    content: entry.content,
    category: entry.category,
    position: countRow?.total ?? 0,
    embedding,
  });

  invalidateKnowledgeCache(businessId);

  return { id };
}

export async function updateBusinessMemory({
  businessId,
  memoryId,
  update,
}: {
  businessId: string;
  memoryId: string;
  update: MemoryEntryUpdate;
}) {
  const [owned] = await db
    .select({
      id: businessMemories.id,
      title: businessMemories.title,
      content: businessMemories.content,
    })
    .from(businessMemories)
    .where(
      and(
        eq(businessMemories.id, memoryId),
        eq(businessMemories.businessId, businessId),
      ),
    )
    .limit(1);

  if (!owned) {
    return null;
  }

  // Invalidate the old embedding cache before content changes.
  await invalidateEmbeddingCache(
    memoryEmbeddingText(owned.title, owned.content),
  );

  const nextTitle = update.title ?? owned.title;
  const nextContent = update.content ?? owned.content;

  const embedding = await generateEmbedding(
    memoryEmbeddingText(nextTitle, nextContent),
  );

  const setValues: Partial<typeof businessMemories.$inferInsert> = {
    title: nextTitle,
    content: nextContent,
    embedding,
  };

  if (update.category !== undefined) {
    setValues.category = update.category;
  }

  if (update.position !== undefined) {
    setValues.position = update.position;
  }

  await db
    .update(businessMemories)
    .set(setValues)
    .where(eq(businessMemories.id, memoryId));

  invalidateKnowledgeCache(businessId);

  return { id: memoryId };
}

export async function deleteBusinessMemory({
  businessId,
  memoryId,
}: {
  businessId: string;
  memoryId: string;
}) {
  const [owned] = await db
    .select({
      id: businessMemories.id,
      title: businessMemories.title,
      content: businessMemories.content,
    })
    .from(businessMemories)
    .where(
      and(
        eq(businessMemories.id, memoryId),
        eq(businessMemories.businessId, businessId),
      ),
    )
    .limit(1);

  if (!owned) {
    return null;
  }

  await invalidateEmbeddingCache(
    memoryEmbeddingText(owned.title, owned.content),
  );

  await db.delete(businessMemories).where(eq(businessMemories.id, memoryId));

  invalidateKnowledgeCache(businessId);

  return { id: memoryId };
}
