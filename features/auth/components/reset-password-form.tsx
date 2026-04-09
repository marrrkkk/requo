"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage, getFieldError, getValidationState } from "@/features/auth/utils";
import { resetPasswordSchema } from "@/features/auth/schemas";
import type { AuthFormState } from "@/features/auth/types";
import { AuthFormFeedback } from "@/features/auth/components/auth-form-feedback";
import { FormActions } from "@/components/shared/form-layout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { PasswordInput } from "@/features/auth/components/password-input";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<AuthFormState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const validationResult = resetPasswordSchema.safeParse({
      token,
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!validationResult.success) {
      setState(getValidationState(validationResult.error));
      return;
    }

    setState({});

    startTransition(async () => {
      const result = await authClient.resetPassword({
        token: validationResult.data.token,
        newPassword: validationResult.data.password,
      });

      if (result.error) {
        setState({
          error: getAuthErrorMessage(
            result.error,
            "That reset link is invalid or has expired.",
          ),
        });
        return;
      }

      window.location.assign("/login?reset=success");
    });
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-6">
        <AuthFormFeedback
          error="This reset link is missing its token. Request a new password reset email."
          errorTitle="Reset link unavailable"
        />
        <Button asChild className="w-full" size="lg">
          <Link href="/forgot-password">Request a new reset link</Link>
        </Button>
      </div>
    );
  }

  const passwordError = getFieldError(state.fieldErrors, "password");
  const confirmPasswordError = getFieldError(state.fieldErrors, "confirmPassword");

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <AuthFormFeedback
        error={state.error}
        success={state.success}
        errorTitle="We could not reset the password."
      />

      <FieldGroup>
        <Field data-invalid={Boolean(passwordError) || undefined}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <FieldContent>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              maxLength={128}
              minLength={8}
              placeholder="At least 8 characters"
              required
              aria-invalid={Boolean(passwordError) || undefined}
              disabled={isPending}
            />
            <FieldError
              errors={passwordError ? [{ message: passwordError }] : undefined}
            />
          </FieldContent>
        </Field>

        <Field data-invalid={Boolean(confirmPasswordError) || undefined}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <FieldContent>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              maxLength={128}
              minLength={8}
              placeholder="Re-enter your new password"
              required
              aria-invalid={Boolean(confirmPasswordError) || undefined}
              disabled={isPending}
            />
            <FieldError
              errors={
                confirmPasswordError
                  ? [{ message: confirmPasswordError }]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <FormActions className="items-stretch sm:items-stretch">
        <Button className="w-full" disabled={isPending} type="submit" size="lg">
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Updating password...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </FormActions>

      <p className="pt-1 text-center text-sm text-muted-foreground">
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/forgot-password"
        >
          Request another reset email
        </Link>
      </p>
    </form>
  );
}
