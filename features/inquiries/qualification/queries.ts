import { and, eq, gte, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { inquiries } from "@/lib/db/schema";
import type { RecentInquiryInput } from "@/features/inquiries/qualification/types";

/**
 * Fetch recent inquiries from the same email for duplicate detection.
 *
 * Returns inquiries from the same customerEmail for the same business
 * within the last `windowDays` days, excluding the current inquiry.
 */
export async function getRecentInquiriesForDuplicateCheck(input: {
  businessId: string;
  customerEmail: string;
  excludeInquiryId: string;
  windowDays: number;
}): Promise<RecentInquiryInput[]> {
  const { businessId, customerEmail, excludeInquiryId, windowDays } = input;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const rows = await db
    .select({
      id: inquiries.id,
      details: inquiries.details,
      submittedAt: inquiries.submittedAt,
      customerEmail: inquiries.customerEmail,
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, businessId),
        eq(inquiries.customerEmail, customerEmail),
        ne(inquiries.id, excludeInquiryId),
        gte(inquiries.submittedAt, windowStart),
        isNull(inquiries.deletedAt),
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    details: row.details,
    submittedAt: row.submittedAt,
    customerEmail: row.customerEmail!,
  }));
}
