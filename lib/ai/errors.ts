import "server-only";

// ---------------------------------------------------------------------------
// AI Provider Error Utilities
//
// Centralizes error classification so the router can decide whether to
// fall back to the next provider or stop immediately.
//
// Retryable (triggers fallback):
//   408 timeout, 409 conflict/capacity, 429 rate limit,
//   500, 502, 503, 504 server errors,
//   network timeouts, connection errors, model temporarily unavailable.
//
// Non-retryable (stops immediately):
//   400 bad request, 401 invalid key, 403 permission denied,
//   404 invalid endpoint/model, 422 invalid payload.
// ---------------------------------------------------------------------------

import type { AiProviderName } from "@/lib/ai/types";

const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Determine whether an error is retryable (should trigger fallback). */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AiProviderError) {
    return error.retryable;
  }

  if (isNetworkError(error)) {
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
