import type { z } from "zod";

import type { AuthFormState } from "@/features/auth/types";
import { getFieldError, getValidationActionState } from "@/lib/action-state";

export function getAuthErrorMessage(
  error: {
    message?: string | null;
    statusText?: string | null;
  } | null | undefined,
  fallback: string,
) {
  return error?.message || error?.statusText || fallback;
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
