import "server-only";

import { db } from "@/lib/db/client";
import { aiSecurityEvents } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// AI Security Events Logger
//
// Fire-and-forget utility that logs AI security events (injection detection,
// rejection, output redaction) to the ai_security_events table. Failures are
// swallowed with a console.error — callers should never block on logging.
// ---------------------------------------------------------------------------

export type AiSecurityEventType =
  | "injection_detected"
  | "injection_rejected"
  | "output_redacted"
  | "conversation_locked"
  | "canary_leak_detected";

export type LogAiSecurityEventParams = {
  eventType: AiSecurityEventType;
  patternMatched: string;
  userId?: string | null;
  businessId?: string | null;
  rawInput: string;
};

function createId() {
  return `ase_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Computes SHA-256 hash of the raw input text.
 * Used to store a fingerprint without persisting raw user content.
 */
async function hashInput(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Logs an AI security event to the database. Fire-and-forget — does not throw
 * on failure, only logs to console.error.
 */
export function logAiSecurityEvent(params: LogAiSecurityEventParams): void {
  const { eventType, patternMatched, userId, businessId, rawInput } = params;

  // Fire-and-forget: start the async work but don't block the caller
  void (async () => {
    try {
      const id = createId();
      const inputHash = await hashInput(rawInput);

      await db.insert(aiSecurityEvents).values({
        id,
        eventType,
        patternMatched,
        userId: userId ?? null,
        businessId: businessId ?? null,
        inputHash,
      });
    } catch (error) {
      console.error("[ai-security-events] Failed to log event:", error);
    }
  })();
}
