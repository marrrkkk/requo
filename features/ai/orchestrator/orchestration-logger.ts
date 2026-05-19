import { logAiInvocation, recordUsage } from "@/lib/ai";
import type { OrchestrationLogEntry } from "./types";

// ---------------------------------------------------------------------------
// Orchestration Logger — structured observability for each orchestrated request
//
// Writes structured JSON via console.info matching the Token Logger pattern.
// Integrates with the Token Logger for intent classification token tracking
// and the Usage Limiter for quota accounting.
// ---------------------------------------------------------------------------

/** Weight applied to intent classification usage events (1 = lightweight task). */
const CLASSIFICATION_USAGE_WEIGHT = 1;

/**
 * Logs an orchestration entry as structured JSON via console.info.
 *
 * Side effects:
 * - Calls `logAiInvocation` for intent classification token usage
 * - Calls `recordUsage` with weight 0.5 for classification quota tracking
 */
export async function logOrchestration(entry: OrchestrationLogEntry): Promise<void> {
  // Structured JSON console.info line for server log aggregation
  console.info(
    JSON.stringify({
      type: "orchestration",
      timestamp: entry.timestamp,
      conversationId: entry.conversationId,
      userId: entry.userId,
      businessId: entry.businessId,
      intentCategory: entry.intentCategory,
      promptModulesIncluded: entry.promptModulesIncluded,
      promptModulesOmitted: entry.promptModulesOmitted,
      totalPromptTokens: entry.totalPromptTokens,
      toolsInjectedCount: entry.toolsInjectedCount,
      memoryEntriesRetrieved: entry.memoryEntriesRetrieved,
      memoryRetrievalMs: entry.memoryRetrievalMs,
      intentClassificationMs: entry.intentClassificationMs,
      totalOrchestrationOverheadMs: entry.totalOrchestrationOverheadMs,
      model: entry.model,
      provider: entry.provider,
      phaseDurations: entry.phaseDurations,
      status: entry.status,
      failedPhase: entry.failedPhase ?? null,
    }),
  );

  // Log intent classification tokens via the Token Logger
  if (entry.totalPromptTokens > 0) {
    await logAiInvocation({
      userId: entry.userId,
      businessId: entry.businessId,
      taskType: "intent_classification",
      model: entry.model,
      provider: entry.provider,
      inputTokens: entry.totalPromptTokens,
      outputTokens: 0,
      cacheHit: false,
      latencyMs: entry.intentClassificationMs,
      status: entry.status === "success" ? "success" : "error",
      errorMessage: entry.failedPhase
        ? `Orchestration failed at phase: ${entry.failedPhase}`
        : null,
    });
  }

  // Record usage against the user's monthly quota
  await recordUsage(
    entry.userId,
    entry.businessId,
    "intent_classification",
    CLASSIFICATION_USAGE_WEIGHT,
  );
}

// ---------------------------------------------------------------------------
// Timer utility — measures wall-clock milliseconds per orchestration phase
// ---------------------------------------------------------------------------

/**
 * Creates a timer that measures elapsed wall-clock milliseconds since creation.
 * Failed phases should record their duration as -1.
 */
export function createTimer(): { elapsed(): number } {
  const start = performance.now();

  return {
    elapsed(): number {
      return Math.round(performance.now() - start);
    },
  };
}
