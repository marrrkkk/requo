import "server-only";

import { asc, count, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db/client";
import {
  quoteLibraryEntries,
  quoteLibraryEntryItems,
} from "@/lib/db/schema";
import {
  getWorkspacePricingCacheTags,
  settingsWorkspaceCacheLife,
} from "@/lib/cache/workspace-tags";
import type {
  DashboardQuoteLibraryEntry,
  DashboardQuoteLibrarySummary,
} from "@/features/quotes/types";

export async function getQuoteLibraryForWorkspace(
  workspaceId: string,
): Promise<DashboardQuoteLibraryEntry[]> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspacePricingCacheTags(workspaceId));

  const entries = await db
    .select({
      id: quoteLibraryEntries.id,
      kind: quoteLibraryEntries.kind,
      name: quoteLibraryEntries.name,
      description: quoteLibraryEntries.description,
      createdAt: quoteLibraryEntries.createdAt,
      updatedAt: quoteLibraryEntries.updatedAt,
    })
    .from(quoteLibraryEntries)
    .where(eq(quoteLibraryEntries.workspaceId, workspaceId))
    .orderBy(asc(quoteLibraryEntries.kind), asc(quoteLibraryEntries.name));

  if (!entries.length) {
    return [];
  }

  const items = await db
    .select({
      id: quoteLibraryEntryItems.id,
      entryId: quoteLibraryEntryItems.entryId,
      description: quoteLibraryEntryItems.description,
      quantity: quoteLibraryEntryItems.quantity,
      unitPriceInCents: quoteLibraryEntryItems.unitPriceInCents,
      position: quoteLibraryEntryItems.position,
    })
    .from(quoteLibraryEntryItems)
    .where(
      inArray(
        quoteLibraryEntryItems.entryId,
        entries.map((entry) => entry.id),
      ),
    )
    .orderBy(
      asc(quoteLibraryEntryItems.entryId),
      asc(quoteLibraryEntryItems.position),
      asc(quoteLibraryEntryItems.createdAt),
    );

  const itemsByEntryId = new Map<
    string,
    DashboardQuoteLibraryEntry["items"]
  >();

  for (const item of items) {
    const existingItems = itemsByEntryId.get(item.entryId) ?? [];

    existingItems.push({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
      position: item.position,
    });

    itemsByEntryId.set(item.entryId, existingItems);
  }

  return entries.map((entry) => {
    const entryItems = itemsByEntryId.get(entry.id) ?? [];

    return {
      id: entry.id,
      kind: entry.kind,
      name: entry.name,
      description: entry.description,
      itemCount: entryItems.length,
      totalInCents: entryItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceInCents,
        0,
      ),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      items: entryItems,
    };
  });
}

export async function getQuoteLibrarySummaryForWorkspace(
  workspaceId: string,
): Promise<DashboardQuoteLibrarySummary> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspacePricingCacheTags(workspaceId));

  const [entrySummary] = await db
    .select({
      entryCount: count(quoteLibraryEntries.id),
    })
    .from(quoteLibraryEntries)
    .where(eq(quoteLibraryEntries.workspaceId, workspaceId));

  const kindCounts = await db
    .select({
      kind: quoteLibraryEntries.kind,
      count: count(quoteLibraryEntries.id),
    })
    .from(quoteLibraryEntries)
    .where(eq(quoteLibraryEntries.workspaceId, workspaceId))
    .groupBy(quoteLibraryEntries.kind);

  return {
    entryCount: entrySummary?.entryCount ?? 0,
    blockCount:
      kindCounts.find((entry) => entry.kind === "block")?.count ?? 0,
    packageCount:
      kindCounts.find((entry) => entry.kind === "package")?.count ?? 0,
  };
}
