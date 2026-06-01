import type { IntentCategory } from "./types";

// ---------------------------------------------------------------------------
// Intent-Aware Token Allocation
//
// Maps classified intents to maxOutputTokens values for the AI stream.
// Simple lookups (data_query, general_question) get fewer tokens.
// Complex drafting tasks (quote_action, follow_up_action) get more.
// Mid-range tasks (analytics, workflow_guidance, memory_recall) get moderate.
//
// Validates: Requirements 24.1, 24.2, 24.3
// ---------------------------------------------------------------------------

const INTENT_TOKEN_MAP: Record<IntentCategory, number> = {
  data_query: 800,
  general_question: 800,
  quote_action: 2200,
  follow_up_action: 2200,
  analytics: 1400,
  workflow_guidance: 1400,
  memory_recall: 1400,
};

/**
 * Returns the maxOutputTokens value for a given classified intent.
 *
 * - data_query / general_question → 800
 * - quote_action / follow_up_action → 2200
 * - analytics / workflow_guidance / memory_recall → 1400
 */
export function getMaxOutputTokensForIntent(intent: IntentCategory): number {
  return INTENT_TOKEN_MAP[intent];
}
