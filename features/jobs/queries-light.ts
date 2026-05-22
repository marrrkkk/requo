import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";

/**
 * Check if a job exists for a given quote.
 */
export async function hasJobForQuote(quoteId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.quoteId, quoteId))
    .limit(1);

  return !!row;
}
