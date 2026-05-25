import type { ActionInput } from "./index";
import type { ActionResult } from "../types";
import { changeInquiryStatusForBusiness } from "@/features/inquiries/mutations";
import {
  inquiryWorkflowStatuses,
  type InquiryWorkflowStatus,
} from "@/features/inquiries/types";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Updates the inquiry status to the configured target status with validation.
 * (Requirement 4.6)
 */
export async function executeUpdateInquiryStatus(
  input: ActionInput,
): Promise<ActionResult> {
  const config = input.actionConfig as Extract<
    typeof input.actionConfig,
    { type: "update_inquiry_status" }
  >;
  const payload = input.triggerPayload as Record<string, unknown>;

  const inquiryId = payload.inquiryId as string | undefined;

  if (!inquiryId) {
    return {
      success: false,
      error:
        "Cannot update inquiry status: trigger payload does not include inquiryId.",
    };
  }

  // Validate the target status is a valid workflow status (not "archived" or "overdue")
  const validWorkflowStatuses: readonly string[] = inquiryWorkflowStatuses;
  if (!validWorkflowStatuses.includes(config.status)) {
    return {
      success: false,
      error: `Invalid target inquiry status: "${config.status}". Valid statuses: ${inquiryWorkflowStatuses.join(", ")}.`,
    };
  }

  // Get business owner as the actor for automated status changes
  const [business] = await db
    .select({ ownerUserId: businesses.ownerUserId })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  if (!business) {
    return { success: false, error: "Business not found." };
  }

  const result = await changeInquiryStatusForBusiness({
    businessId: input.businessId,
    inquiryId,
    actorUserId: business.ownerUserId,
    nextStatus: config.status as InquiryWorkflowStatus,
  });

  if (!result) {
    return {
      success: false,
      error: "Inquiry not found or does not belong to this business.",
    };
  }

  if (!result.changed) {
    if ("locked" in result && result.locked) {
      return {
        success: false,
        error: `Cannot change inquiry status: inquiry is locked (${("lockedReason" in result && result.lockedReason) || "archived"}).`,
      };
    }
    // Already at the target status — treat as success
    return {
      success: true,
      result: { inquiryId, status: config.status, alreadyAtTarget: true },
    };
  }

  return {
    success: true,
    result: { inquiryId, previousStatus: result.previousStatus, newStatus: result.nextStatus },
  };
}
