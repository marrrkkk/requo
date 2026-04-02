import type { z } from "zod";

import type { AuthFormState } from "@/features/auth/types";

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
  return {
    error: message,
    fieldErrors: error.flatten().fieldErrors,
  };
}

export function getFieldError(
  fieldErrors: AuthFormState["fieldErrors"],
  field: string,
) {
  return fieldErrors?.[field]?.[0];
}
