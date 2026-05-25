import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { automationScheduledJobs } from "@/lib/db/schema/automations";

import type { DelayConfig } from "./types";

// ---------------------------------------------------------------------------
// Scheduler (Requirements 2.4, 3.7)
// Placeholder — full implementation in task 3.3
// ---------------------------------------------------------------------------

/**
 * Creates a scheduled job for delayed automation execution.
 * Calculates scheduledFor based on the delay config.
 */
export async function createScheduledJob(
  automationId: string,
  businessId: string,
  triggerPayload: unknown,
  delay: DelayConfig,
): Promise<string> {
  const scheduledFor = calculateScheduledTime(delay);

  const id = crypto.randomUUID();

  await db.insert(automationScheduledJobs).values({
    id,
    automationId,
    businessId,
    triggerPayload,
    scheduledFor,
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
  });

  return id;
}

/**
 * Cancels all pending scheduled jobs for a given automation rule.
 * Called when a rule is disabled or deleted (Requirement 3.7).
 */
export async function cancelPendingJobs(automationId: string): Promise<void> {
  await db
    .update(automationScheduledJobs)
    .set({ status: "cancelled" })
    .where(eq(automationScheduledJobs.automationId, automationId));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateScheduledTime(delay: DelayConfig): Date {
  const now = new Date();

  switch (delay.unit) {
    case "minutes":
      return new Date(now.getTime() + delay.value * 60 * 1000);
    case "hours":
      return new Date(now.getTime() + delay.value * 60 * 60 * 1000);
    case "days":
      return new Date(now.getTime() + delay.value * 24 * 60 * 60 * 1000);
    default:
      return now;
  }
}
