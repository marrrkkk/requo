import type { ActionInput } from "./index";
import type { ActionResult } from "../types";
import { createFollowUpForBusiness } from "@/features/follow-ups/mutations";
import { getFutureUtcDateString } from "@/features/follow-ups/utils";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Creates a follow-up record with configurable title, reason, channel,
 * and due date offset relative to the trigger event timestamp.
 * (Requirement 4.3)
 */
export async function executeCreateFollowUp(
  input: ActionInput,
): Promise<ActionResult> {
  const config = input.actionConfig as Extract<
    typeof input.actionConfig,
    { type: "create_follow_up" }
  >;
  const payload = input.triggerPayload as Record<string, unknown>;

  // Resolve the inquiry/quote context from the trigger payload
  const inquiryId = (payload.inquiryId as string) ?? null;
  const quoteId = (payload.quoteId as string) ?? null;

  if (!inquiryId && !quoteId) {
    return {
      success: false,
      error:
        "Cannot create follow-up: trigger payload must include inquiryId or quoteId.",
    };
  }

  // Get the business owner to use as the actor for automated follow-ups
  const [business] = await db
    .select({ ownerUserId: businesses.ownerUserId })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  if (!business) {
    return { success: false, error: "Business not found." };
  }

  // Calculate due date as offset from now
  const dueDate = getFutureUtcDateString(config.dueDateOffsetDays);

  const result = await createFollowUpForBusiness({
    businessId: input.businessId,
    inquiryId,
    quoteId,
    actorUserId: business.ownerUserId,
    followUp: {
      title: config.title,
      reason: config.reason,
      channel: config.channel,
      dueDate,
    },
  });

  if (!result) {
    return {
      success: false,
      error: "Failed to create follow-up. The linked inquiry or quote may not exist.",
    };
  }

  return {
    success: true,
    result: { followUpId: result.followUpId },
  };
}
