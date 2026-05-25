import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessAutomations } from "@/lib/db/schema/automations";
import { sendPushToBusinessSubscribers } from "@/lib/push/send";

// ---------------------------------------------------------------------------
// Failure Tracking and Auto-Disable (Requirement 9.3)
// ---------------------------------------------------------------------------

/** Number of consecutive failures before auto-disabling a rule. */
const AUTO_DISABLE_THRESHOLD = 5;

/**
 * Tracks an automation execution result. On success, resets the consecutive
 * failure counter. On failure, increments it and auto-disables the rule if
 * the threshold (5 consecutive failures) is reached.
 *
 * When auto-disabled, sends a push notification to the business owner.
 */
export async function trackExecutionResult(
  automationId: string,
  success: boolean,
): Promise<void> {
  try {
    if (success) {
      // Reset consecutive failures on success
      await db
        .update(businessAutomations)
        .set({ consecutiveFailures: 0 })
        .where(eq(businessAutomations.id, automationId));
    } else {
      // Increment consecutive failures
      const [updated] = await db
        .update(businessAutomations)
        .set({
          consecutiveFailures: sql`${businessAutomations.consecutiveFailures} + 1`,
        })
        .where(eq(businessAutomations.id, automationId))
        .returning({
          id: businessAutomations.id,
          name: businessAutomations.name,
          businessId: businessAutomations.businessId,
          consecutiveFailures: businessAutomations.consecutiveFailures,
          enabled: businessAutomations.enabled,
        });

      if (
        updated &&
        updated.enabled &&
        updated.consecutiveFailures >= AUTO_DISABLE_THRESHOLD
      ) {
        await autoDisableAutomation(updated);
      }
    }
  } catch (error) {
    console.error(
      `[automations/failure-tracker] Failed to track execution result for automation ${automationId}:`,
      error,
    );
  }
}

// ---------------------------------------------------------------------------
// Auto-Disable
// ---------------------------------------------------------------------------

async function autoDisableAutomation(automation: {
  id: string;
  name: string;
  businessId: string;
}): Promise<void> {
  // Disable the automation rule
  await db
    .update(businessAutomations)
    .set({ enabled: false })
    .where(eq(businessAutomations.id, automation.id));

  // Send push notification to business subscribers
  await sendPushToBusinessSubscribers(automation.businessId, {
    title: "Automation auto-disabled",
    body: `"${automation.name}" was disabled after 5 consecutive failures. Check the automation history for details.`,
    url: `/automations`,
  }).catch((err) => {
    console.error(
      `[automations/failure-tracker] Failed to send auto-disable notification for automation ${automation.id}:`,
      err,
    );
  });

  console.warn(
    `[automations/failure-tracker] Auto-disabled automation "${automation.name}" (${automation.id}) after ${AUTO_DISABLE_THRESHOLD} consecutive failures.`,
  );
}
