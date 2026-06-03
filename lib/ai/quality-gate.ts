/**
 * AI Quality Gate Logger
 *
 * Detects uncertainty phrases in AI responses when tools were available,
 * indicating a missed tool-use opportunity. Runs in onFinish callback
 * without blocking the response stream.
 *
 * Fire-and-forget: failures are swallowed with console.error.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualityGateEvent {
  conversationId: string;
  userMessage: string;
  classifiedIntent: string;
  toolsAvailable: string[];
  responseSnippet: string;
}

// ---------------------------------------------------------------------------
// Uncertainty Detection
// ---------------------------------------------------------------------------

/**
 * Phrases that indicate the AI expressed uncertainty when it had tools
 * available that could have resolved the query.
 */
const UNCERTAINTY_PHRASES = [
  "i don't know",
  "i'm not sure",
  "i cannot find",
] as const;

/**
 * Checks whether the AI response contains uncertainty phrases.
 * Case-insensitive matching against the full response text.
 */
function containsUncertainty(response: string): boolean {
  const lower = response.toLowerCase();
  return UNCERTAINTY_PHRASES.some((phrase) => lower.includes(phrase));
}

// ---------------------------------------------------------------------------
// Quality Gate Check
// ---------------------------------------------------------------------------

/**
 * Checks the AI response for quality gate violations and logs an event
 * when uncertainty is detected while tools were injected.
 *
 * This function is designed to run in the `onFinish` callback of the AI
 * stream — it is fire-and-forget and will never throw.
 *
 * @param response - The full AI response text
 * @param context - Metadata about the request for logging
 */
export function checkQualityGate(
  response: string,
  context: QualityGateEvent,
): void {
  try {
    // Only log when tools were injected (missed tool-use opportunity)
    if (!context.toolsAvailable || context.toolsAvailable.length === 0) {
      return;
    }

    if (!containsUncertainty(response)) {
      return;
    }

    // Build a short snippet for the log (first 200 chars)
    const snippet = response.length > 200
      ? response.slice(0, 200) + "…"
      : response;

    console.warn("[quality-gate] Uncertainty detected with tools available", {
      conversationId: context.conversationId,
      userMessage: context.userMessage.slice(0, 200),
      classifiedIntent: context.classifiedIntent,
      toolsAvailable: context.toolsAvailable,
      responseSnippet: snippet,
    });
  } catch (error) {
    // Fire-and-forget: never propagate errors from quality gate logging
    console.error("[quality-gate] Failed to check quality gate:", error);
  }
}
