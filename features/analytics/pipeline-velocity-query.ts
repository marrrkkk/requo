import "server-only";

import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";

import type { PipelineVelocity } from "@/features/analytics/types";
import { computeMedian } from "@/features/analytics/utils/median";
import { getNonDeletedQuoteCondition } from "@/features/quotes/queries";
import { db } from "@/lib/db/client";
import { inquiries, quotes } from "@/lib/db/schema";

/**
 * Computes pipeline velocity: the median days from inquiry submission
 * (`inquiries.submittedAt`) to quote acceptance (`quotes.acceptedAt`).
 *
 * Only includes inquiries that resulted in at least one accepted quote
 * where the acceptance occurred within the selected date range.
 *
 * Returns `medianDays: null` when fewer than 3 data points exist.
 */
export async function getPipelineVelocity(
  businessId: string,
  since: Date,
  until: Date,
): Promise<PipelineVelocity> {
  // Find all inquiry→accepted quote pairs where acceptedAt is within the range.
  // We take the earliest accepted quote per inquiry to avoid double-counting.
  const rows = await db
    .select({
      durationDays: sql<number>`
        extract(epoch from (min(${quotes.acceptedAt}) - ${inquiries.submittedAt})) / 86400
      `.as("duration_days"),
    })
    .from(inquiries)
    .innerJoin(
      quotes,
      and(
        eq(quotes.inquiryId, inquiries.id),
        eq(quotes.businessId, businessId),
        getNonDeletedQuoteCondition(),
        eq(quotes.status, "accepted"),
        isNotNull(quotes.acceptedAt),
        gte(quotes.acceptedAt, since),
        lte(quotes.acceptedAt, until),
      ),
    )
    .where(eq(inquiries.businessId, businessId))
    .groupBy(inquiries.id, inquiries.submittedAt);

  const durations = rows.map((r) => Number(r.durationDays));
  const medianDays = computeMedian(durations);

  return {
    medianDays: medianDays !== null ? Math.round(medianDays * 10) / 10 : null,
    dataPointCount: durations.length,
  };
}
