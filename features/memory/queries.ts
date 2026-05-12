"server only";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db/client";
import { businessMemories } from "@/lib/db/schema/memories";
import type {
  DashboardMemory,
  DashboardMemoryData,
  DashboardMemorySummary,
  BusinessMemoryContext,
} from "@/features/memory/types";
import {
  getBusinessMemoryCacheTags,
  settingsBusinessCacheLife,
} from "@/lib/cache/business-tags";
import { getUsageLimit } from "@/lib/plans";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

export async function getMemoryDashboardData(
  businessId: string,
): Promise<DashboardMemoryData> {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(...getBusinessMemoryCacheTags(businessId));

  const memories = await db
    .select({
      id: businessMemories.id,
      title: businessMemories.title,
      content: businessMemories.content,
      position: businessMemories.position,
      createdAt: businessMemories.createdAt,
      updatedAt: businessMemories.updatedAt,
    })
    .from(businessMemories)
    .where(eq(businessMemories.businessId, businessId))
    .orderBy(asc(businessMemories.position), desc(businessMemories.createdAt));

  return { memories };
}

export async function getMemorySummaryForBusiness(
  businessId: string,
  plan: plan,
): Promise<DashboardMemorySummary> {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(...getBusinessMemoryCacheTags(businessId));

  const [[memoryCountResult]] = await Promise.all([
    db
      .select({
        memoryCount: count(businessMemories.id),
      })
      .from(businessMemories)
      .where(eq(businessMemories.businessId, businessId)),
  ]);

  const memoryCount = memoryCountResult?.memoryCount ?? 0;
  const limit = getUsageLimit(plan, "memoriesPerBusiness");

  return {
    memoryCount,
    limit,
  };
}

export async function buildBusinessMemoryContext(
  businessId: string,
): Promise<BusinessMemoryContext> {
  "use cache";

  cacheLife(settingsBusinessCacheLife);
  cacheTag(...getBusinessMemoryCacheTags(businessId));

  const memories = await db
    .select({
      title: businessMemories.title,
      content: businessMemories.content,
    })
    .from(businessMemories)
    .where(eq(businessMemories.businessId, businessId))
    .orderBy(asc(businessMemories.position));

  const combinedText = memories
    .map((m) => `## ${m.title}\n${m.content}`)
    .join("\n\n");

  return {
    memories,
    combinedText,
  };
}
