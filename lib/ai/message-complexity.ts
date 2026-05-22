import "server-only";

// ---------------------------------------------------------------------------
// Message Complexity Classifier — determines token budget tier for a message
//
// Classifies user messages as "simple" or "complex" to enable tiered
// context loading and model routing. Simple messages (lookups, yes/no,
// status checks) get minimal context and cheap models. Complex messages
// (drafting, analysis, multi-part questions) get full context.
//
// Heuristic-based — no AI call needed.
// ---------------------------------------------------------------------------

export type MessageComplexity = "simple" | "complex";

/**
 * Classifies message complexity based on heuristics:
 * - Word count
 * - Question patterns
 * - Action verbs indicating generation tasks
 * - Multi-part indicators
 */
export function classifyMessageComplexity(message: string): MessageComplexity {
  const normalized = message.trim().toLowerCase();
  const wordCount = normalized.split(/\s+/).length;

  // Very short messages are almost always simple lookups
  if (wordCount <= 5) {
    // Unless they contain generation verbs
    if (GENERATION_PATTERNS.some((p) => p.test(normalized))) {
      return "complex";
    }
    return "simple";
  }

  // Check for generation/drafting/analysis patterns
  if (GENERATION_PATTERNS.some((p) => p.test(normalized))) {
    return "complex";
  }

  // Multi-part questions (contains "and" connecting questions, multiple "?")
  const questionMarks = (normalized.match(/\?/g) ?? []).length;
  if (questionMarks >= 2) {
    return "complex";
  }

  // Check for analytical keywords
  if (ANALYSIS_PATTERNS.some((p) => p.test(normalized))) {
    return "complex";
  }

  // Long messages tend to be complex
  if (wordCount > 30) {
    return "complex";
  }

  // Default: simple
  return "simple";
}

/**
 * Returns the recommended history limit based on message complexity.
 * Simple messages need less history context.
 */
export function getHistoryLimitForComplexity(
  complexity: MessageComplexity,
  surface: string,
): number {
  if (complexity === "simple") {
    return surface === "dashboard" ? 4 : 6;
  }
  // Complex
  return surface === "dashboard" ? 10 : 20;
}

/**
 * Returns the recommended max context characters based on message complexity.
 * Simple messages need less surface context.
 */
export function getContextBudgetForComplexity(
  complexity: MessageComplexity,
): number {
  if (complexity === "simple") {
    return 6_000; // ~1500 tokens
  }
  return 16_000; // ~4000 tokens (current default)
}

// Patterns that indicate the user wants content generation
const GENERATION_PATTERNS = [
  /\b(write|draft|compose|create|generate|suggest|propose|rewrite|improve|rephrase)\b/,
  /\b(summarize|summarise|break\s?down|analyze|analyse|compare|explain)\b/,
  /\b(help me (with|write|draft|create|think))\b/,
  /\b(can you (write|draft|create|generate|make))\b/,
  /\b(what should i (say|write|include|add))\b/,
];

// Patterns that indicate analytical/complex work
const ANALYSIS_PATTERNS = [
  /\b(why|how come|what happened|what went wrong)\b/,
  /\b(trend|pattern|overview|breakdown|comparison)\b/,
  /\b(strategy|plan|recommendation|advice)\b/,
  /\b(all|every|complete|full list|everything)\b/,
];
