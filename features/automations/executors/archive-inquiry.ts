import type { ActionInput } from "./index";
import type { ActionResult } from "../types";
import { archiveInquiryForBusiness } from "@/features/inquiries/mutations";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Archives an inquiry with an optional reason.
 * (Requirement 4.6)
 */
export async function executeArchiveInquiry(
  input: ActionInput,
): Promise<ActionResult> {
  const config = input.actionConfig as Extract<
    typeof input.actionConfig,
    { type: "archive_inquiry" }
  >;
  const payload = input.triggerPayload as Record<string, unknown>;

  const inquiryId = payload.inquiryId as string | undefined;

  if (!inquiryId) {
    return {
      success: false,
      error:
        "Cannot archive inquiry: trigger payload does not include inquiryId.",
    };
  }

  // Get business owner as the actor
  const [business] = await db
    .select({ ownerUserId: businesses.ownerUserId })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  if (!business) {
    return { success: false, error: "Business not found." };
  }

  const result = await archiveInquiryForBusiness({
    businessId: input.businessId,
    inquiryId,
    actorUserId: business.ownerUserId,
  });

  if (!result) {
    return {
      success: false,
      error: "Inquiry not found or does not belong to this business.",
    };
  }

  if (!result.changed) {
    // Already archived — treat as success
    return {
      success: true,
      result: { inquiryId, alreadyArchived: true },
    };
  }

  return {
    success: true,
    result: { inquiryId, reason: config.reason ?? "Automated archival" },
  };
}
