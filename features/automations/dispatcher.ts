import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { inngest } from "@/lib/inngest/client";
import { inngestEvents } from "@/lib/inngest/events";
import {
  automationLogs,
  businessAutomations,
} from "@/lib/db/schema/automations";
import { assertBusinessActionRateLimit } from "@/lib/public-action-rate-limit";

import type {
  ActionConfig,
  Condition,
  DelayConfig,
  TriggerPayload,
  TriggerType,
} from "./types";

// ---------------------------------------------------------------------------
// Event Dispatcher (Requirements 2.1–2.8, 9.1)
// ---------------------------------------------------------------------------

/**
 * Emits a domain event and processes matching automation rules.
 *
 * Called from mutations after successful state changes. The dispatch phase
 * (rule lookup + condition evaluation + scheduling) targets < 200ms.
 * Non-critical action execution is queued via Inngest so it never
 * blocks the calling mutation's response.
 *
 * Never throws — all errors are caught and logged.
 */
export function emitEvent<T extends TriggerType>(
  businessId: string,
  triggerType: T,
  payload: TriggerPayload[T],
): void {
  void queueAutomationDispatch(businessId, triggerType, payload);
}

async function queueAutomationDispatch<T extends TriggerType>(
  businessId: string,
  triggerType: T,
  payload: TriggerPayload[T],
): Promise<void> {
  try {
    await inngest.send({
      name: inngestEvents.automationDispatch,
      data: {
        businessId,
        triggerType,
        payload,
      },
    });
  } catch (error) {
    console.error(
      `[automations] Failed to queue dispatch for ${triggerType} (business: ${businessId}):`,
      error,
    );
  }
}

/**
 * Runs automation dispatch synchronously. Used by the Inngest worker.
 */
export async function runAutomationDispatch<T extends TriggerType>(
  businessId: string,
  triggerType: T,
  payload: TriggerPayload[T],
): Promise<void> {
  try {
    await dispatchEvent(businessId, triggerType, payload);
  } catch (error) {
    console.error(
      `[automations] Unhandled error in dispatchEvent for ${triggerType} (business: ${businessId}):`,
      error,
    );
  }
}

// ---------------------------------------------------------------------------
// Internal Dispatch Logic
// ---------------------------------------------------------------------------

async function dispatchEvent<T extends TriggerType>(
  businessId: string,
  triggerType: T,
  payload: TriggerPayload[T],
): Promise<void> {
  const startTime = performance.now();

  // Requirement 10.6: Rate limit — 200 event emissions per business per minute
  const rateLimitAllowed = await assertBusinessActionRateLimit({
    action: "automation-event-emit",
    scope: businessId,
    limit: 200,
    windowMs: 60 * 1000, // 1 minute
  });

  if (!rateLimitAllowed) {
    console.warn(
      `[automations] Event emission rate limit exceeded for business ${businessId} (trigger: ${triggerType}). Skipping dispatch.`,
    );
    return;
  }

  // Requirement 2.2: Query enabled rules matching businessId + triggerType, ordered by priority desc
  const matchingRules = await db
    .select({
      id: businessAutomations.id,
      conditions: businessAutomations.conditions,
      actions: businessAutomations.actions,
      delay: businessAutomations.delay,
      priority: businessAutomations.priority,
    })
    .from(businessAutomations)
    .where(
      and(
        eq(businessAutomations.businessId, businessId),
        eq(businessAutomations.triggerType, triggerType),
        eq(businessAutomations.enabled, true),
      ),
    )
    .orderBy(desc(businessAutomations.priority));

  if (matchingRules.length === 0) return;

  // Process each matching rule
  for (const rule of matchingRules) {
    const ruleStartTime = performance.now();

    try {
      // Requirement 2.3: Evaluate conditions against the trigger payload
      const conditions = rule.conditions as Condition[] | null;
      if (conditions && conditions.length > 0) {
        const { evaluateConditions } = await import("./condition-evaluator");
        const conditionsPassed = evaluateConditions(conditions, payload);
        if (!conditionsPassed) continue;
      }

      const delay = rule.delay as DelayConfig | null;

      if (delay) {
        // Requirement 2.4: Create scheduled job for delayed execution
        const { createScheduledJob } = await import("./scheduler");
        await createScheduledJob(rule.id, businessId, payload, delay);

        // Log the scheduling
        await writeLog({
          automationId: rule.id,
          businessId,
          triggerType,
          triggerPayload: payload,
          actionsExecuted: [{ scheduled: true, delay }],
          status: "success",
          durationMs: Math.round(performance.now() - ruleStartTime),
        });
      } else {
        // Requirement 2.5: Execute actions immediately
        const actions = rule.actions as ActionConfig[] | unknown;
        const actionsList = extractActions(actions);

        const results = await executeActionsForRule(
          businessId,
          actionsList,
          payload,
        );

        const hasFailures = results.some((r) => !r.success);
        const allFailed = results.every((r) => !r.success);

        await writeLog({
          automationId: rule.id,
          businessId,
          triggerType,
          triggerPayload: payload,
          actionsExecuted: results,
          status: allFailed
            ? "failure"
            : hasFailures
              ? "partial_failure"
              : "success",
          durationMs: Math.round(performance.now() - ruleStartTime),
          error: hasFailures
            ? results
                .filter((r) => !r.success)
                .map((r) => r.error)
                .join("; ")
            : undefined,
        });

        // Requirement 9.3: Track consecutive failures for auto-disable
        const { trackExecutionResult } = await import("./failure-tracker");
        await trackExecutionResult(rule.id, !allFailed);
      }
    } catch (error) {
      // Requirement 2.8: Log failure, don't throw
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await writeLog({
        automationId: rule.id,
        businessId,
        triggerType,
        triggerPayload: payload,
        actionsExecuted: [],
        status: "failure",
        durationMs: Math.round(performance.now() - ruleStartTime),
        error: errorMessage,
      }).catch((logErr) => {
        console.error("[automations] Failed to write error log:", logErr);
      });
    }
  }

  const totalDuration = performance.now() - startTime;
  if (totalDuration > 200) {
    console.warn(
      `[automations] Dispatch phase exceeded 200ms target: ${Math.round(totalDuration)}ms for ${triggerType} (business: ${businessId}, rules: ${matchingRules.length})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Action Execution
// ---------------------------------------------------------------------------

async function executeActionsForRule(
  businessId: string,
  actions: ActionConfig[],
  triggerPayload: unknown,
): Promise<Array<{ success: boolean; type?: string; result?: unknown; error?: string }>> {
  const results: Array<{
    success: boolean;
    type?: string;
    result?: unknown;
    error?: string;
  }> = [];

  for (const action of actions) {
    try {
      const { executeAction } = await import("./executors/index");
      const result = await executeAction(action.type, {
        businessId,
        triggerPayload,
        actionConfig: action,
      });
      results.push({ success: result.success, type: action.type, result: result.result, error: result.error });
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
 * Extracts a flat array of ActionConfig from the rule's actions field.
 * Actions can be a flat array or a workflow graph. For graph-based workflows,
 * only simple action nodes are extracted (multi-step graph execution is handled
 * by the processor).
 */
function extractActions(actions: unknown): ActionConfig[] {
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
    const graph = actions as { nodes: Array<{ type: string; data: Record<string, unknown> }> };
    return graph.nodes
      .filter((node) => node.type === "action")
      .map((node) => {
        const { label: _label, actionType, ...rest } = node.data;
        // The workspace stores actionType in data, but ActionConfig uses `type`
        return { type: actionType, ...rest } as ActionConfig;
      });
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
    console.error("[automations] Failed to write automation log:", error);
  }
}
