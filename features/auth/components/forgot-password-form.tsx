"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";

import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage, getFieldError, getValidationState } from "@/features/auth/utils";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import type { AuthFormState } from "@/features/auth/types";
import { AuthFormFeedback } from "@/features/auth/components/auth-form-feedback";
import { FormActions } from "@/components/shared/form-layout";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const successMessage =
  "If that email exists, we sent a reset link.";

export function ForgotPasswordForm() {
  const [state, setState] = useState<AuthFormState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const validationResult = forgotPasswordSchema.safeParse({
      email: formData.get("email"),
    });

    if (!validationResult.success) {
      setState(getValidationState(validationResult.error));
      return;
    }

    setState({});

    startTransition(async () => {
      const result = await authClient.requestPasswordReset({
        email: validationResult.data.email,
        redirectTo: "/reset-password",
      });

      if (result.error) {
        setState({
          error: getAuthErrorMessage(
            result.error,
            "We couldn't submit the reset request. Try again in a moment.",
          ),
        });
        return;
      }

      setState({
        success: successMessage,
      });
    });
  }

  const emailError = getFieldError(state.fieldErrors, "email");

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <AuthFormFeedback
        error={state.error}
        success={state.success}
        successTitle="Check your inbox"
      />

      <FieldGroup>
        <Field data-invalid={Boolean(emailError) || undefined}>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <FieldContent>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={320}
              placeholder="owner@example.com"
              required
              aria-invalid={Boolean(emailError) || undefined}
              disabled={isPending}
            />
            <FieldError errors={emailError ? [{ message: emailError }] : undefined} />
          </FieldContent>
        </Field>
      </FieldGroup>

      <FormActions className="items-stretch sm:items-stretch">
        <Button className="w-full" disabled={isPending} type="submit" size="lg">
          {isPending ? "Sending reset link..." : "Send reset link"}
        </Button>
      </FormActions>

      <p className="pt-1 text-center text-sm text-muted-foreground">
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/login"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
