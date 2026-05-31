import "server-only";

import { checkUsageLimit, recordUsage, TASK_WEIGHTS } from "@/lib/ai/usage-limiter";
import type { BusinessPlan } from "@/lib/plans/plans";

// ---------------------------------------------------------------------------
// Assistant Usage — credit enforcement for streaming chat with tool calls
//
// This module bridges the gap between the general usage limiter and the
// specific needs of the assistant chat:
// - Pre-flight budget check before starting a stream
// - Post-stream recording that accounts for tool calls
// - Hard cap on tool calls per turn to prevent recursive loops
// ---------------------------------------------------------------------------

/** Maximum tool calls allowed within a single assistant turn. */
export const MAX_TOOL_CALLS_PER_TURN = 10;

/** Maximum steps (model invocations including tool round-trips) per turn. */
export const MAX_STEPS_PER_TURN = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssistantBudgetCheck = {
  userId: string;
  businessId: string;
  plan: BusinessPlan;
};

export type AssistantBudgetResult =
  | { allowed: true; remainingCredits: number }
  | { allowed: false; reason: "quota_exceeded"; message: string };

export type AssistantTurnUsage = {
  userId: string;
  businessId: string;
  toolCallCount: number;
};

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Pre-flight check before starting an assistant stream.
 * Verifies the user has at least 1 credit remaining this month.
 * Does NOT deduct anything — deduction happens after the stream completes.
 */
export async function checkAssistantBudget(
  input: AssistantBudgetCheck,
): Promise<AssistantBudgetResult> {
  const result = await checkUsageLimit({
    userId: input.userId,
    businessId: input.businessId,
    taskType: "assistant_message",
    plan: input.plan,
  });

  if (!result.allowed) {
    return {
      allowed: false,
      reason: "quota_exceeded",
      message: result.message,
    };
  }

  return { allowed: true, remainingCredits: -1 }; // -1 = not computed (avoid extra query)
}

/**
 * Records usage for a completed assistant turn.
 *
 * Credits deducted:
 * - 1 credit for the assistant message itself
 * - 1 credit per tool call made during the turn
 *
 * Only call this after the stream completes successfully.
 * Do NOT call on errors, rate-limit failures, or empty responses.
 */
export async function recordAssistantTurn(
  input: AssistantTurnUsage,
): Promise<{ creditsUsed: number }> {
  const { userId, businessId, toolCallCount } = input;

  // Record the base message credit
  const messageWeight = TASK_WEIGHTS.assistant_message;
  await recordUsage(userId, businessId, "assistant_message", messageWeight);

  // Record tool call credits (one event per tool call for granular tracking)
  const toolWeight = TASK_WEIGHTS.assistant_tool_call;
  let toolCredits = 0;

  if (toolCallCount > 0) {
    // Batch as a single event with total weight to reduce DB writes
    const totalToolWeight = toolWeight * Math.min(toolCallCount, MAX_TOOL_CALLS_PER_TURN);
    await recordUsage(userId, businessId, "assistant_tool_call", totalToolWeight);
    toolCredits = totalToolWeight;
  }

  const creditsUsed = messageWeight + toolCredits;

  // Structured log for monitoring
  console.info(
    JSON.stringify({
      type: "assistant_usage",
      timestamp: new Date().toISOString(),
      userId,
      businessId,
      creditsUsed,
      toolCallCount: Math.min(toolCallCount, MAX_TOOL_CALLS_PER_TURN),
    }),
  );

  return { creditsUsed };
}
