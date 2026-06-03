import "server-only";

import { and, asc, eq, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  automationLogs,
  automationScheduledJobs,
  businessAutomations,
} from "@/lib/db/schema/automations";
import { businesses } from "@/lib/db/schema/businesses";

import type { ActionConfig, TriggerType } from "./types";
import { executeAction } from "./executors/index";

// ---------------------------------------------------------------------------
// Scheduled Job Processor (Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 10.3)
// ---------------------------------------------------------------------------

/** Maximum time budget in milliseconds (55 seconds to fit 60s Vercel limit). */
const TIME_BUDGET_MS = 55_000;

/** Maximum number of jobs to process per invocation. */
const BATCH_LIMIT = 50;

/** Base backoff interval in minutes for retry scheduling. */
const BACKOFF_BASE_MINUTES = 15;

/**
 * Processes pending scheduled automation jobs.
 *
 * Called from the Inngest cron function every 5 minutes.
 * Queries due jobs, executes their actions, handles retries with exponential backoff,
 * and respects a 55-second time budget.
 *
 * Idempotent: skips jobs already in `processing` or `completed` status.
 */
export async function processScheduledJobs(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  aborted: boolean;
}> {
  const startTime = performance.now();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let aborted = false;

  // Requirement 3.2: Query pending jobs where scheduledFor <= now, limit 50
  const now = new Date();
  const dueJobs = await db
    .select({
      id: automationScheduledJobs.id,
      automationId: automationScheduledJobs.automationId,
      businessId: automationScheduledJobs.businessId,
      triggerPayload: automationScheduledJobs.triggerPayload,
      status: automationScheduledJobs.status,
      attempts: automationScheduledJobs.attempts,
      maxAttempts: automationScheduledJobs.maxAttempts,
    })
    .from(automationScheduledJobs)
    .where(
      and(
        eq(automationScheduledJobs.status, "pending"),
        lte(automationScheduledJobs.scheduledFor, now),
      ),
    )
    .orderBy(asc(automationScheduledJobs.scheduledFor))
    .limit(BATCH_LIMIT);

  for (const job of dueJobs) {
    // Requirement 3.5: Abort batch if time budget exceeded
    const elapsed = performance.now() - startTime;
    if (elapsed >= TIME_BUDGET_MS) {
      aborted = true;
      break;
    }

    // Requirement 3.6: Idempotent — skip processing/completed jobs
    if (job.status !== "pending") {
      skipped++;
      continue;
    }

    const jobStartTime = performance.now();

    try {
      // Set status to processing
      await db
        .update(automationScheduledJobs)
        .set({ status: "processing" })
        .where(eq(automationScheduledJobs.id, job.id));

      // Requirement 10.3: Re-validate business ownership before execution
      const validationResult = await validateJobExecution(
        job.businessId,
        job.automationId,
      );

      if (!validationResult.valid) {
        // Business or automation no longer valid — mark as failed
        await db
          .update(automationScheduledJobs)
          .set({
            status: "failed",
            lastError: validationResult.reason,
            completedAt: new Date(),
          })
          .where(eq(automationScheduledJobs.id, job.id));

        await writeLog({
          automationId: job.automationId,
          businessId: job.businessId,
          triggerType: validationResult.triggerType ?? "inquiry.received",
          triggerPayload: job.triggerPayload,
          actionsExecuted: [],
          status: "failure",
          durationMs: Math.round(performance.now() - jobStartTime),
          error: validationResult.reason,
        });

        failed++;
        processed++;
        continue;
      }

      // Extract actions from the automation
      const actions = await extractActions(validationResult.actions, job.triggerPayload);

      if (actions.length === 0) {
        await db
          .update(automationScheduledJobs)
          .set({
            status: "completed",
            completedAt: new Date(),
          })
          .where(eq(automationScheduledJobs.id, job.id));

        await writeLog({
          automationId: job.automationId,
          businessId: job.businessId,
          triggerType: validationResult.triggerType,
          triggerPayload: job.triggerPayload,
          actionsExecuted: [],
          status: "success",
          durationMs: Math.round(performance.now() - jobStartTime),
        });

        succeeded++;
        processed++;
        continue;
      }

      // Execute actions
      const results = await executeActionsSequentially(
        job.businessId,
        actions,
        job.triggerPayload,
      );

      const hasFailures = results.some((r) => !r.success);
      const allFailed = results.every((r) => !r.success);

      if (hasFailures) {
        // Requirement 3.4: Retry with exponential backoff
        const newAttempts = job.attempts + 1;

        if (newAttempts < job.maxAttempts) {
          // Revert to pending with backoff: attempts * 15 minutes
          const backoffMs = newAttempts * BACKOFF_BASE_MINUTES * 60 * 1000;
          const nextScheduledFor = new Date(Date.now() + backoffMs);

          await db
            .update(automationScheduledJobs)
            .set({
              status: "pending",
              attempts: newAttempts,
              scheduledFor: nextScheduledFor,
              lastError: results
                .filter((r) => !r.success)
                .map((r) => r.error)
                .join("; "),
            })
            .where(eq(automationScheduledJobs.id, job.id));
        } else {
          // Max attempts reached — mark as failed
          await db
            .update(automationScheduledJobs)
            .set({
              status: "failed",
              attempts: newAttempts,
              lastError: results
                .filter((r) => !r.success)
                .map((r) => r.error)
                .join("; "),
              completedAt: new Date(),
            })
            .where(eq(automationScheduledJobs.id, job.id));
        }

        failed++;
      } else {
        // All actions succeeded — mark completed
        await db
          .update(automationScheduledJobs)
          .set({
            status: "completed",
            attempts: job.attempts + 1,
            completedAt: new Date(),
          })
          .where(eq(automationScheduledJobs.id, job.id));

        succeeded++;
      }

      // Write execution log
      await writeLog({
        automationId: job.automationId,
        businessId: job.businessId,
        triggerType: validationResult.triggerType,
        triggerPayload: job.triggerPayload,
        actionsExecuted: results,
        status: allFailed
          ? "failure"
          : hasFailures
            ? "partial_failure"
            : "success",
        durationMs: Math.round(performance.now() - jobStartTime),
        error: hasFailures
          ? results
              .filter((r) => !r.success)
              .map((r) => r.error)
              .join("; ")
          : undefined,
      });

      // Requirement 9.3: Track consecutive failures for auto-disable
      const { trackExecutionResult } = await import("./failure-tracker");
      await trackExecutionResult(job.automationId, !allFailed);

      processed++;
    } catch (error) {
      // Unexpected error — handle retry logic
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const newAttempts = job.attempts + 1;

      if (newAttempts < job.maxAttempts) {
        const backoffMs = newAttempts * BACKOFF_BASE_MINUTES * 60 * 1000;
        const nextScheduledFor = new Date(Date.now() + backoffMs);

        await db
          .update(automationScheduledJobs)
          .set({
            status: "pending",
            attempts: newAttempts,
            scheduledFor: nextScheduledFor,
            lastError: errorMessage,
          })
          .where(eq(automationScheduledJobs.id, job.id))
          .catch((updateErr) => {
            console.error(
              "[automations/processor] Failed to update job after error:",
              updateErr,
            );
          });
      } else {
        await db
          .update(automationScheduledJobs)
          .set({
            status: "failed",
            attempts: newAttempts,
            lastError: errorMessage,
            completedAt: new Date(),
          })
          .where(eq(automationScheduledJobs.id, job.id))
          .catch((updateErr) => {
            console.error(
              "[automations/processor] Failed to mark job as failed:",
              updateErr,
            );
          });
      }

      await writeLog({
        automationId: job.automationId,
        businessId: job.businessId,
        triggerType: "inquiry.received", // fallback — we may not know the real type
        triggerPayload: job.triggerPayload,
        actionsExecuted: [],
        status: "failure",
        durationMs: Math.round(performance.now() - jobStartTime),
        error: errorMessage,
      }).catch((logErr) => {
        console.error(
          "[automations/processor] Failed to write error log:",
          logErr,
        );
      });

      failed++;
      processed++;
    }
  }

  return { processed, succeeded, failed, skipped, aborted };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type ValidationResult =
  | { valid: true; triggerType: TriggerType; actions: unknown }
  | { valid: false; reason: string; triggerType?: TriggerType };

/**
 * Re-validates that the business still exists and the automation is still enabled
 * before executing a scheduled job's actions (Requirement 10.3).
 */
async function validateJobExecution(
  businessId: string,
  automationId: string,
): Promise<ValidationResult> {
  // Check business still exists
  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return { valid: false, reason: "Business no longer exists" };
  }

  // Check automation still exists and is enabled
  const [automation] = await db
    .select({
      id: businessAutomations.id,
      enabled: businessAutomations.enabled,
      triggerType: businessAutomations.triggerType,
      actions: businessAutomations.actions,
      businessId: businessAutomations.businessId,
    })
    .from(businessAutomations)
    .where(eq(businessAutomations.id, automationId))
    .limit(1);

  if (!automation) {
    return { valid: false, reason: "Automation rule no longer exists" };
  }

  if (!automation.enabled) {
    return {
      valid: false,
      reason: "Automation rule is disabled",
      triggerType: automation.triggerType,
    };
  }

  // Verify business ownership matches
  if (automation.businessId !== businessId) {
    return {
      valid: false,
      reason: "Automation does not belong to the specified business",
      triggerType: automation.triggerType,
    };
  }

  return {
    valid: true,
    triggerType: automation.triggerType,
    actions: automation.actions,
  };
}

// ---------------------------------------------------------------------------
// Action Execution
// ---------------------------------------------------------------------------

async function executeActionsSequentially(
  businessId: string,
  actions: ActionConfig[],
  triggerPayload: unknown,
): Promise<
  Array<{ success: boolean; type?: string; result?: unknown; error?: string }>
> {
  const results: Array<{
    success: boolean;
    type?: string;
    result?: unknown;
    error?: string;
  }> = [];

  for (const action of actions) {
    try {
      const result = await executeAction(action.type, {
        businessId,
        triggerPayload,
        actionConfig: action,
      });
      results.push({
        success: result.success,
        type: action.type,
        result: result.result,
        error: result.error,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      results.push({ success: false, type: action.type, error: errorMessage });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a flat array of ActionConfig from the automation's actions field.
 * Handles both flat arrays and workflow graph format. For graph format, it
 * evaluates conditions dynamically against the payload to traverse true/false branches.
 * Must stay in sync with `dispatcher.ts:extractActions`.
 */
async function extractActions(actions: unknown, payload: unknown): Promise<ActionConfig[]> {
  if (Array.isArray(actions)) {
    return actions as ActionConfig[];
  }

  // Workflow graph format: { nodes: [...], edges: [...] }
  if (
    actions &&
    typeof actions === "object" &&
    "nodes" in actions &&
    Array.isArray((actions as { nodes: unknown[] }).nodes)
  ) {
    const graph = actions as {
      nodes: Array<{ type: string; data: Record<string, unknown> }>;
    };
    const extracted: ActionConfig[] = [];
    const { evaluateConditions } = await import("./condition-evaluator");

    function processNode(type: string, data: Record<string, unknown>) {
      if (type === "action") {
        const { label: _label, actionType, ...rest } = data;
        extracted.push({ type: actionType, ...rest } as ActionConfig);
      } else if (type === "condition") {
        const condition = {
          field: (data.field as string) || "",
          operator: (data.operator as "eq") || "eq",
          value: data.value as string | number | boolean,
        };
        const passed = evaluateConditions([condition], payload);

        if (passed) {
          const trueBranch = (data.trueBranch as Array<Record<string, unknown>>) ?? [];
          for (const nested of trueBranch) {
            if (nested && nested.type && nested.config) {
              processNode(nested.type as string, nested.config as Record<string, unknown>);
            }
          }
        } else {
          const falseBranch = (data.falseBranch as Array<Record<string, unknown>>) ?? [];
          for (const nested of falseBranch) {
            if (nested && nested.type && nested.config) {
              processNode(nested.type as string, nested.config as Record<string, unknown>);
            }
          }
          // Condition blocked main chain
          return false;
        }
      }
      return true;
    }

    for (const node of graph.nodes) {
      const shouldContinue = processNode(node.type, node.data ?? {});
      if (!shouldContinue) break;
    }

    return extracted;
  }

  return [];
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

async function writeLog(entry: {
  automationId: string;
  businessId: string;
  triggerType: TriggerType;
  triggerPayload: unknown;
  actionsExecuted: unknown[];
  status: "success" | "partial_failure" | "failure";
  durationMs: number;
  error?: string;
}): Promise<void> {
  try {
    await db.insert(automationLogs).values({
      id: crypto.randomUUID(),
      automationId: entry.automationId,
      businessId: entry.businessId,
      triggerType: entry.triggerType,
      triggerPayload: entry.triggerPayload,
      actionsExecuted: entry.actionsExecuted,
      status: entry.status,
      durationMs: entry.durationMs,
      error: entry.error ?? null,
    });
  } catch (error) {
    console.error("[automations/processor] Failed to write automation log:", error);
  }
}


// ---------------------------------------------------------------------------
// Log Retention Cleanup (Requirement 9.5)
// ---------------------------------------------------------------------------

/** Maximum number of log rows to delete per cleanup run to avoid long queries. */
const CLEANUP_BATCH_LIMIT = 500;

/** Retention period in days. Logs older than this are eligible for deletion. */
const LOG_RETENTION_DAYS = 90;

/**
 * Deletes automation logs older than 90 days.
 * Runs as a low-priority task after job processing to avoid impacting
 * time-sensitive scheduled job execution.
 *
 * Uses a batch limit (500 rows per run) to prevent long-running queries.
 * Returns the number of deleted rows.
 */
export async function cleanupExpiredLogs(): Promise<{ deleted: number }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);

    // Find IDs of expired logs (batch limited)
    const expiredIds = await db
      .select({ id: automationLogs.id })
      .from(automationLogs)
      .where(lte(automationLogs.createdAt, cutoffDate))
      .limit(CLEANUP_BATCH_LIMIT);

    if (expiredIds.length === 0) {
      return { deleted: 0 };
    }

    // Delete by IDs
    const idsToDelete = expiredIds.map((row) => row.id);
    await db.execute(
      sql`DELETE FROM automation_logs WHERE id = ANY(${idsToDelete})`,
    );

    const deletedCount = idsToDelete.length;

    console.log(
      `[automations/cleanup] Deleted ${deletedCount} expired automation logs (older than ${LOG_RETENTION_DAYS} days)`,
    );

    return { deleted: deletedCount };
  } catch (error) {
    console.error(
      "[automations/cleanup] Failed to clean up expired logs:",
      error,
    );
    return { deleted: 0 };
  }
}
