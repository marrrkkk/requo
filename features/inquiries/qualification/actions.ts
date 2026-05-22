"use server";

import { updateTag } from "next/cache";

import {
  getBusinessInquiryDetailCacheTags,
  getBusinessInquiryListCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import { db } from "@/lib/db/client";
import { inquiryDuplicates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Dismiss a duplicate warning for an inquiry.
 * Validates business access before allowing dismissal.
 * Persists the dismissal so the warning does not reappear.
 */
export async function dismissDuplicateWarningAction(
  duplicateId: string,
  businessId: string,
  inquiryId: string,
): Promise<void> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    throw new Error(ownerAccess.error);
  }

  const { user, businessContext } = ownerAccess;

  // Ensure the user's active business matches the requested businessId
  if (businessContext.business.id !== businessId) {
    throw new Error("You do not have access to that business action.");
  }

  await db
    .update(inquiryDuplicates)
    .set({
      dismissedAt: new Date(),
      dismissedBy: user.id,
    })
    .where(
      and(
        eq(inquiryDuplicates.id, duplicateId),
        eq(inquiryDuplicates.businessId, businessId),
      ),
    );

  const tags = uniqueCacheTags([
    ...getBusinessInquiryDetailCacheTags(businessId, inquiryId),
    ...getBusinessInquiryListCacheTags(businessId),
  ]);
  for (const tag of tags) {
    updateTag(tag);
  }
}
