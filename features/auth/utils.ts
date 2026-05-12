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

const magicLinkQueryErrorFallback =
  "This sign-in link is invalid or has expired. Request a new one from the login page.";

export function getMagicLinkQueryErrorMessage(
  code: string | null | undefined,
): string | null {
  if (!code) {
    return null;
  }

  switch (code) {
    case "INVALID_TOKEN":
    case "EXPIRED_TOKEN":
    case "ATTEMPTS_EXCEEDED":
      return magicLinkQueryErrorFallback;
    case "new_user_signup_disabled":
      return "Sign-in links can’t create new accounts from this page. Create an account first.";
    case "failed_to_create_user":
    case "failed_to_create_session":
      return "We couldn’t complete sign-in. Try again or use another sign-in method.";
    default:
      return null;
  }
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
