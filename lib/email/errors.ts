import "server-only";

import type { EmailProviderName } from "@/lib/email/types";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const AMBIGUOUS_NETWORK_PATTERNS = [
  "aborterror",
  "connection reset",
  "econnreset",
  "operation was aborted",
  "signal timed out",
  "socket hang up",
  "timeout",
  "timed out",
];

const PRE_SEND_NETWORK_PATTERNS = [
  "eai_again",
  "econnrefused",
  "enotfound",
  "temporary failure in name resolution",
];

const RETRYABLE_MESSAGE_PATTERNS = [
  "daily quota",
  "monthly quota",
  "quota exceeded",
  "rate limit",
  "rate_limit",
  "temporarily unavailable",
  "temporary provider",
  "try again later",
];

const NON_RETRYABLE_MESSAGE_PATTERNS = [
  "bad request",
  "blocked",
  "bounced",
  "domain is not verified",
  "forbidden",
  "invalid api key",
  "invalid from",
  "invalid parameter",
  "invalid recipient",
  "invalid sender",
  "missing required",
  "not verified",
  "restricted_api_key",
  "suppressed",
  "unauthorized",
  "validation",
];

export class EmailProviderError extends Error {
  constructor(
    public readonly provider: EmailProviderName,
    public readonly statusCode: number | null,
    public readonly retryable: boolean,
    public readonly ambiguous: boolean,
    public readonly code: string | null,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EmailProviderError";
  }
}

export class EmailSendError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

function getRecord(error: unknown) {
  return typeof error === "object" && error !== null
    ? (error as Record<string, unknown>)
    : null;
}

function extractStatusCode(error: unknown): number | null {
  const record = getRecord(error);

  if (!record) {
    return null;
  }

  for (const key of ["statusCode", "status", "httpCode", "code"] as const) {
    const value = record[key];

    if (typeof value === "number" && value >= 100 && value < 600) {
      return value;
    }
  }

  if (record.error) {
    return extractStatusCode(record.error);
  }

  return null;
}

function extractCode(error: unknown) {
  const record = getRecord(error);

  if (!record) {
    return null;
  }

  for (const key of ["name", "code", "type"] as const) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function getMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  const record = getRecord(error);

  if (record && typeof record.message === "string") {
    return record.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown email provider error.";
}

function includesPattern(message: string, patterns: string[]) {
  const normalized = message.toLowerCase();

  return patterns.some((pattern) => normalized.includes(pattern));
}

export function classifyEmailError(error: unknown): {
  statusCode: number | null;
  code: string | null;
  message: string;
  retryable: boolean;
  ambiguous: boolean;
} {
  if (error instanceof EmailProviderError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ambiguous: error.ambiguous,
    };
  }

  const statusCode = extractStatusCode(error);
  const code = extractCode(error);
  const message = getMessage(error);
  const codeAndMessage = `${code ?? ""} ${message}`.toLowerCase();

  if (includesPattern(codeAndMessage, AMBIGUOUS_NETWORK_PATTERNS)) {
    return { statusCode, code, message, retryable: true, ambiguous: true };
  }

  if (statusCode === 408) {
    return { statusCode, code, message, retryable: true, ambiguous: true };
  }

  if (
    RETRYABLE_STATUS_CODES.has(statusCode ?? 0) ||
    includesPattern(codeAndMessage, PRE_SEND_NETWORK_PATTERNS) ||
    includesPattern(codeAndMessage, RETRYABLE_MESSAGE_PATTERNS)
  ) {
    return { statusCode, code, message, retryable: true, ambiguous: false };
  }

  if (
    statusCode === 400 ||
    statusCode === 401 ||
    statusCode === 403 ||
    statusCode === 404 ||
    statusCode === 409 ||
    statusCode === 422 ||
    includesPattern(codeAndMessage, NON_RETRYABLE_MESSAGE_PATTERNS)
  ) {
    return { statusCode, code, message, retryable: false, ambiguous: false };
  }

  return { statusCode, code, message, retryable: false, ambiguous: false };
}

export function isRetryableEmailError(error: unknown) {
  return classifyEmailError(error).retryable;
}

export function wrapEmailProviderError(
  provider: EmailProviderName,
  error: unknown,
) {
  const classification = classifyEmailError(error);

  return new EmailProviderError(
    provider,
    classification.statusCode,
    classification.retryable,
    classification.ambiguous,
    classification.code,
    classification.message,
    error,
  );
}
