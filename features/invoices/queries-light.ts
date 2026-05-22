import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { invoices } from "@/lib/db/schema";

/**
 * Check if an invoice exists for a given quote. Returns the invoice ID if found.
 */
export async function getInvoiceIdForQuote(quoteId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.quoteId, quoteId), isNull(invoices.deletedAt)))
    .limit(1);

  return row?.id ?? null;
}

/**
 * Check if an invoice exists for a given quote.
 */
export async function hasInvoiceForQuote(quoteId: string): Promise<boolean> {
  const id = await getInvoiceIdForQuote(quoteId);
  return id !== null;
}
