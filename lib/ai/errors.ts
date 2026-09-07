import "server-only";

// ---------------------------------------------------------------------------
// AI Provider Error Utilities
//
// Centralizes error classification so routing can decide whether to advance
// to the next provider or stop.
//
// Retryable (advance to next provider):
//   408 timeout, 409 conflict/capacity, 413 TPM overflow on Groq,
//   429 rate limit, 500, 502, 503, 504 server errors,
//   network timeouts, connection errors, model temporarily unavailable,
//   capacity/quota messages even when the status code is ambiguous,
//   404 / model-not-found (dead catalog identifier — skipped without
//   consuming an attempt; see fallback-model.ts).
//
// Oversized (shrink-or-escalate, NOT plain rotation):
//   context-length and request-too-large messages. The same payload fails
//   identically on the next model, so these route to a higher-context
//   candidate or compaction rather than a blind retry.
//
// Non-retryable by status alone no longer ends a turn: the non-streaming
// path advances through its chain on any failure and only an exhausted
// candidate list is a failure.
// ---------------------------------------------------------------------------

import type { AiProviderName } from "@/lib/ai/types";

const RETRYABLE_STATUS_CODES = new Set([
  408, // timeout
  409, // conflict/capacity
  413, // payload too large (Groq returns this for TPM overflows on large prompts)
  429, // rate limit
  500, // server error
  502, // bad gateway
  503, // service unavailable
  504, // gateway timeout
]);

const NETWORK_ERROR_PATTERNS = [
  "econnrefused",
  "econnreset",
  "etimedout",
  "enotfound",
  "epipe",
  "fetch failed",
  "network error",
  "socket hang up",
  "aborterror",
  "the operation was aborted",
  "signal timed out",
];

/**
 * Message fragments that indicate a retryable capacity/quota problem even
 * when the status code is missing or ambiguous.
 *
 * NOTE: context-length / request-too-large fragments are deliberately NOT
 * here — they are oversized payloads (see OVERSIZED_MESSAGE_PATTERNS) and
 * must route to shrink-or-escalate, not plain rotation.
 *
 * NOTE: unsupported-property rejections (`reasoning_content`,
 * `is unsupported`) are deliberately NOT here either. They are prompt-shape
 * problems, not capacity problems, so classifying them as retryable put a
 * healthy model on a capacity cooldown. The prompt is kept portable by
 * `stripReasoningMiddleware` in `lib/ai/fallback-model.ts`; if one still
 * lands it advances as a non-retryable error without poisoning the counters.
 */
const RETRYABLE_MESSAGE_PATTERNS = [
  "rate_limit_exceeded",
  "rate limit exceeded",
  "rate-limit",
  "quota exceeded",
  "quota_exceeded",
  "tokens per minute",
  "tpm",
  "capacity",
  "overloaded",
  "service unavailable",
  "model_overloaded",
];

/**
 * The same payload fails identically on the next model — route to a
 * higher-context candidate or compaction, not a plain rotation.
 */
const OVERSIZED_MESSAGE_PATTERNS = [
  "request too large",
  "too many tokens",
  "context length",
  "context_length",
  "maximum context",
  "max_tokens_exceeded",
  "input too long",
  "prompt too long",
  "exceeds the maximum",
  "context window",
];

/** A model identifier the provider no longer serves (404 / not-found). */
const MODEL_NOT_FOUND_PATTERNS = [
  "model_not_found",
  "model not found",
  "model does not exist",
  "no such model",
  "unknown model",
  "invalid model",
  "model_not_available",
  "not a valid model",
  "does not exist",
];

/**
 * Structured error thrown when a provider fails.
 * Carries the provider name, HTTP status (if any), and whether the error
 * is retryable so the router can act on it without re-inspecting.
 */
export class AiProviderError extends Error {
  constructor(
    public readonly provider: AiProviderName,
    public readonly statusCode: number | null,
    public readonly retryable: boolean,
    public readonly retryAfterMs: number | null,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

// ---------------------------------------------------------------------------
// Extraction helpers — each SDK stores status / retry-after differently
// ---------------------------------------------------------------------------

function extractStatusCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  // Groq SDK uses `status`, OpenRouter SDK uses `statusCode`
  for (const key of ["status", "statusCode", "httpCode", "code"] as const) {
    if (key in error) {
      const value = (error as Record<string, unknown>)[key];

      if (typeof value === "number" && value >= 100 && value < 600) {
        return value;
      }
    }
  }

  // Gemini wraps errors in an `error` object sometimes
  if ("error" in error) {
    const inner = (error as { error: unknown }).error;

    return extractStatusCode(inner);
  }

  return null;
}

function extractRetryAfterMs(error: unknown, maxMs = 5_000): number | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  // Some SDKs expose response headers
  const headers =
    "headers" in error
      ? (error as { headers: unknown }).headers
      : "response" in error &&
          typeof (error as { response: unknown }).response === "object" &&
          (error as { response: { headers?: unknown } }).response !== null
        ? (error as { response: { headers: unknown } }).response.headers
        : null;

  if (!headers) {
    return null;
  }

  let retryAfter: string | null = null;

  if (typeof headers === "object" && headers !== null) {
    if ("get" in headers && typeof (headers as { get: unknown }).get === "function") {
      retryAfter = (headers as { get: (key: string) => string | null }).get("retry-after");
    } else if ("retry-after" in headers) {
      const raw = (headers as Record<string, unknown>)["retry-after"];
      retryAfter = typeof raw === "string" ? raw : null;
    }
  }

  if (!retryAfter) {
    return null;
  }

  // retry-after can be seconds (integer) or an HTTP-date
  const seconds = Number(retryAfter);

  if (!Number.isNaN(seconds) && seconds > 0) {
    return Math.min(seconds * 1_000, maxMs);
  }

  // Try parsing as date
  const date = new Date(retryAfter);

  if (!Number.isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    return delayMs > 0 ? Math.min(delayMs, maxMs) : null;
  }

  return null;
}

function isNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function collectErrorText(error: unknown): string {
  const direct =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  let nested = "";

  if (typeof error === "object" && error !== null) {
    const errWithError = error as { error?: { message?: unknown } };

    if (typeof errWithError.error?.message === "string") {
      nested = errWithError.error.message;
    }

    const errWithBody = error as { body?: unknown; responseBody?: unknown; data?: { message?: unknown } };

    if (typeof errWithBody.body === "string") {
      nested += ` ${errWithBody.body}`;
    }

    // Vercel AI SDK errors include responseBody and data.message
    if (typeof errWithBody.responseBody === "string") {
      nested += ` ${errWithBody.responseBody}`;
    }

    if (typeof errWithBody.data?.message === "string") {
      nested += ` ${errWithBody.data.message}`;
    }
  }

  return `${direct} ${nested}`.toLowerCase();
}

/**
 * Detects retryable capacity/rate-limit errors by message content.
 * Used as a safety net when a provider returns a non-standard status code
 * (e.g., Groq sometimes wraps TPM overflows in a 400/413 with a JSON body).
 */
function isRetryableMessage(error: unknown): boolean {
  const haystack = collectErrorText(error);

  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => haystack.includes(pattern));
}

/** A model identifier the provider no longer serves — skip without cost. */
export function isModelNotFoundError(error: unknown): boolean {
  const status = extractStatusCode(error);
  if (status === 404) return true;
  const haystack = collectErrorText(error);
  return MODEL_NOT_FOUND_PATTERNS.some((pattern) => haystack.includes(pattern));
}

/** Payload too large for the model's context — needs shrink-or-escalate. */
export function isOversizedError(error: unknown): boolean {
  const haystack = collectErrorText(error);
  return OVERSIZED_MESSAGE_PATTERNS.some((pattern) => haystack.includes(pattern));
}

const DAY_SCOPE_PATTERNS = [
  "daily",
  "per day",
  "per-day",
  "rpd",
  "tpd",
  "day quota",
  "daily quota",
  "quota per day",
  "requests per day",
  "tokens per day",
  "monthly",
  "per month",
  "neurons",
  "neuron",
];

/**
 * Scope the exhaustion cooldown to the limit that tripped: a refusal naming
 * a daily quota cools down until the day boundary, a per-minute limit cools
 * down for a minute only.
 */
export function classifyExhaustionScope(
  error: unknown,
): "day" | "minute" {
  const haystack = collectErrorText(error);
  if (DAY_SCOPE_PATTERNS.some((pattern) => haystack.includes(pattern))) {
    return "day";
  }
  return "minute";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Determine whether an error should advance to the next provider. */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AiProviderError) {
    return error.retryable;
  }

  // Dead identifiers and oversized payloads both advance — the fallback
  // wrapper distinguishes them (skip-without-cost vs shrink-or-escalate).
  if (isModelNotFoundError(error)) return true;
  if (isOversizedError(error)) return true;

  if (isNetworkError(error)) {
    return true;
  }

  if (isRetryableMessage(error)) {
    return true;
  }

  const status = extractStatusCode(error);

  if (status !== null) {
    return RETRYABLE_STATUS_CODES.has(status);
  }

  // If we cannot determine the nature, treat as retryable to be safe
  return true;
}

/**
 * Wrap a raw SDK error into a structured `AiProviderError`.
 * The router uses this to carry provider context through the fallback chain.
 */
export function wrapProviderError(
  provider: AiProviderName,
  error: unknown,
): AiProviderError {
  const statusCode = extractStatusCode(error);
  const retryable =
    isNetworkError(error) ||
    isRetryableMessage(error) ||
    (statusCode !== null ? RETRYABLE_STATUS_CODES.has(statusCode) : true);
  const retryAfterMs = extractRetryAfterMs(error);
  const message =
    error instanceof Error ? error.message : "Unknown provider error";

  return new AiProviderError(
    provider,
    statusCode,
    retryable,
    retryAfterMs,
    message,
    error,
  );
}

/**
 * Build a sanitized error summary safe for logging.
 * Never includes API keys or full prompt contents.
 */
export function getSanitizedErrorInfo(error: unknown): {
  message: string;
  statusCode: number | null;
  retryable: boolean;
} {
  if (error instanceof AiProviderError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Unknown error",
    statusCode: extractStatusCode(error),
    retryable: isRetryableError(error),
  };
}
