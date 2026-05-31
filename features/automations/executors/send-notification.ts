import type { ActionInput } from "./index";
import type { ActionResult } from "../types";
import { insertBusinessNotification } from "@/features/notifications/mutations";
import { db } from "@/lib/db/client";

/**
 * Creates a push notification using the existing notification infrastructure.
 * (Requirement 4.5)
 */
export async function executeSendNotification(
  input: ActionInput,
): Promise<ActionResult> {
  const config = input.actionConfig as Extract<
    typeof input.actionConfig,
    { type: "send_notification" }
  >;
  const payload = input.triggerPayload as Record<string, unknown>;

  const inquiryId = (payload.inquiryId as string) ?? null;
  const quoteId = (payload.quoteId as string) ?? null;

  await db.transaction(async (tx) => {
    await insertBusinessNotification(tx, {
      businessId: input.businessId,
      inquiryId,
      quoteId,
      type: "automation",
      title: config.title,
      summary: config.body ?? config.title,
      metadata: {
        source: "automation",
        triggerPayload: payload,
      },
    });
  });

  return {
    success: true,
    result: { title: config.title },
  };
}
