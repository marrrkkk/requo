import "server-only";

import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { archiveInquiryForBusiness } from "@/features/inquiries/mutations";
import { db } from "@/lib/db/client";
import { businesses, inquiries } from "@/lib/db/schema";

export type AutoArchiveStaleInquiriesSummary = {
  processed: number;
  archived: number;
  skipped: number;
};

const OPEN_INQUIRY_STATUSES = ["new", "quoted", "waiting", "overdue"] as const;

/**
 * Archives inquiries that have been idle (no status change) for longer than
 * the business's `autoArchiveStaleInquiryDays` window. Only touches open
 * inquiries; won/lost/archived inquiries are never re-processed.
 */
export async function processAutoArchiveStaleInquiries(): Promise<AutoArchiveStaleInquiriesSummary> {
  let processed = 0;
  let archived = 0;
  let skipped = 0;

  const eligibleInquiries = await db
    .select({
      inquiryId: inquiries.id,
      businessId: inquiries.businessId,
      updatedAt: inquiries.updatedAt,
      ownerUserId: businesses.ownerUserId,
      autoArchiveDays: businesses.autoArchiveStaleInquiryDays,
    })
    .from(inquiries)
    .innerJoin(businesses, eq(inquiries.businessId, businesses.id))
    .where(
      and(
        eq(businesses.autoArchiveStaleInquiries, true),
        inArray(inquiries.status, OPEN_INQUIRY_STATUSES),
        isNull(inquiries.archivedAt),
        isNull(inquiries.deletedAt),
        lt(
          inquiries.updatedAt,
          sql`now() - (${businesses.autoArchiveStaleInquiryDays} || ' days')::interval`,
        ),
      ),
    )
    .limit(50);

  for (const row of eligibleInquiries) {
    processed++;

    try {
      await archiveInquiryForBusiness({
        businessId: row.businessId,
        inquiryId: row.inquiryId,
        actorUserId: row.ownerUserId,
      });
      archived++;
    } catch (error) {
      console.error(
        `[auto-archive] Failed to archive stale inquiry ${row.inquiryId}`,
        error,
      );
      skipped++;
    }
  }

  return { processed, archived, skipped };
}