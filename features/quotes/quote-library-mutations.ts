import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  quoteLibraryEntries,
  quoteLibraryEntryItems,
} from "@/lib/db/schema";
import type { QuoteLibraryEntryInput } from "@/features/quotes/quote-library-schemas";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function insertQuoteLibraryActivity(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  {
    businessId,
    actorUserId,
    type,
    summary,
    metadata,
    now,
  }: {
    businessId: string;
    actorUserId: string;
    type: string;
    summary: string;
    metadata?: Record<string, unknown>;
    now: Date;
  },
) {
  await tx.insert(activityLogs).values({
    id: createId("act"),
    businessId,
    actorUserId,
    type,
    summary,
    metadata: metadata ?? {},
    createdAt: now,
    updatedAt: now,
  });
}

type CreateQuoteLibraryEntryForBusinessInput = {
  businessId: string;
  actorUserId: string;
  currency: string;
  entry: QuoteLibraryEntryInput;
};

export async function createQuoteLibraryEntryForBusiness({
  businessId,
  actorUserId,
  currency,
  entry,
}: CreateQuoteLibraryEntryForBusinessInput) {
  const entryId = createId("qlib");
  const now = new Date();

  return db.transaction(async (tx) => {
    await tx.insert(quoteLibraryEntries).values({
      id: entryId,
      businessId,
      kind: entry.kind,
      currency,
      name: entry.name,
      description: entry.description ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(quoteLibraryEntryItems).values(
      entry.items.map((item, index) => ({
        id: createId("qli"),
        businessId,
        entryId,
        description: item.description,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        position: index,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await insertQuoteLibraryActivity(tx, {
      businessId,
      actorUserId,
      type: "quote_library.entry_created",
      summary: `${entry.name} added to the pricing library.`,
      metadata: {
        quoteLibraryEntryId: entryId,
        kind: entry.kind,
        itemCount: entry.items.length,
      },
      now,
    });

    return {
      id: entryId,
    };
  });
}

type UpdateQuoteLibraryEntryForBusinessInput = {
  businessId: string;
  actorUserId: string;
  entryId: string;
  entry: QuoteLibraryEntryInput;
};

export async function updateQuoteLibraryEntryForBusiness({
  businessId,
  actorUserId,
  entryId,
  entry,
}: UpdateQuoteLibraryEntryForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingEntry] = await tx
      .select({
        id: quoteLibraryEntries.id,
        currency: quoteLibraryEntries.currency,
      })
      .from(quoteLibraryEntries)
      .where(
        and(
          eq(quoteLibraryEntries.businessId, businessId),
          eq(quoteLibraryEntries.id, entryId),
        ),
      )
      .limit(1);

    if (!existingEntry) {
      return null;
    }

    await tx
      .update(quoteLibraryEntries)
      .set({
        kind: entry.kind,
        name: entry.name,
        description: entry.description ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(quoteLibraryEntries.businessId, businessId),
          eq(quoteLibraryEntries.id, entryId),
        ),
      );

    await tx
      .delete(quoteLibraryEntryItems)
      .where(
        and(
          eq(quoteLibraryEntryItems.businessId, businessId),
          eq(quoteLibraryEntryItems.entryId, entryId),
        ),
      );

    await tx.insert(quoteLibraryEntryItems).values(
      entry.items.map((item, index) => ({
        id: createId("qli"),
        businessId,
        entryId,
        description: item.description,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        position: index,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await insertQuoteLibraryActivity(tx, {
      businessId,
      actorUserId,
      type: "quote_library.entry_updated",
      summary: `${entry.name} updated in the pricing library.`,
      metadata: {
        quoteLibraryEntryId: entryId,
        kind: entry.kind,
        currency: existingEntry.currency,
        itemCount: entry.items.length,
      },
      now,
    });

    return {
      id: entryId,
    };
  });
}

type DeleteQuoteLibraryEntryForBusinessInput = {
  businessId: string;
  actorUserId: string;
  entryId: string;
};

export async function deleteQuoteLibraryEntryForBusiness({
  businessId,
  actorUserId,
  entryId,
}: DeleteQuoteLibraryEntryForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingEntry] = await tx
      .select({
        id: quoteLibraryEntries.id,
        kind: quoteLibraryEntries.kind,
        name: quoteLibraryEntries.name,
      })
      .from(quoteLibraryEntries)
      .where(
        and(
          eq(quoteLibraryEntries.businessId, businessId),
          eq(quoteLibraryEntries.id, entryId),
        ),
      )
      .limit(1);

    if (!existingEntry) {
      return null;
    }

    await tx
      .delete(quoteLibraryEntries)
      .where(
        and(
          eq(quoteLibraryEntries.businessId, businessId),
          eq(quoteLibraryEntries.id, entryId),
        ),
      );

    await insertQuoteLibraryActivity(tx, {
      businessId,
      actorUserId,
      type: "quote_library.entry_deleted",
      summary: `${existingEntry.name} removed from the pricing library.`,
      metadata: {
        quoteLibraryEntryId: entryId,
        kind: existingEntry.kind,
      },
      now,
    });

    return {
      id: entryId,
    };
  });
}
