import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import type { JobStatus } from "@/features/jobs/types";

/**
 * Check if a job exists for a given quote.
 */
export async function hasJobForQuote(quoteId: string): Promise<boolean> {
  const job = await getJobForQuote(quoteId);

  return job !== null;
}

/**
 * Return the active job ID for a given quote, if one exists.
 */
export async function getJobIdForQuote(quoteId: string): Promise<string | null> {
  const job = await getJobForQuote(quoteId);

  return job?.id ?? null;
}

/**
 * Return the active job ID and status for a given quote, if one exists.
 */
export async function getJobForQuote(
  quoteId: string,
): Promise<{ id: string; status: JobStatus } | null> {
  const [row] = await db
    .select({ id: jobs.id, status: jobs.status })
    .from(jobs)
    .where(and(eq(jobs.quoteId, quoteId), isNull(jobs.deletedAt)))
    .limit(1);

  return row ?? null;
}
