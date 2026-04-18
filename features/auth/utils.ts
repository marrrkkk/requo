import type { z } from "zod";

import type { AuthFormState } from "@/features/auth/types";
import { getFieldError, getValidationActionState } from "@/lib/action-state";

function normalizeAuthErrorMessage(
  value: string | null | undefined,
  fallback: string,
) {
  const message = value?.trim();

  if (!message) {
    return fallback;
  }

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("email not verified")) {
    return "Verify your email before signing in.";
  }

  if (
    normalizedMessage.includes("captcha") ||
    normalizedMessage.includes("turnstile")
  ) {
    return "Complete the security check and try again.";
  }

  if (
    normalizedMessage.includes("too many requests") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "Too many attempts. Wait a few minutes and try again.";
  }

  return message;
}

export function getAuthErrorMessage(
  error: {
    message?: string | null;
    statusText?: string | null;
  } | null | undefined,
  fallback: string,
) {
  return normalizeAuthErrorMessage(
    error?.message || error?.statusText,
    fallback,
  );
}

export function getValidationState(
  error: z.ZodError,
  message = "Check the highlighted fields and try again.",
): AuthFormState {
  return getValidationActionState<
    NonNullable<AuthFormState["fieldErrors"]>,
    AuthFormState
  >(
    error,
    message,
  );
}

export { getFieldError };
