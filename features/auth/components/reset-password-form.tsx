"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage, getFieldError, getValidationState } from "@/features/auth/utils";
import { resetPasswordSchema } from "@/features/auth/schemas";
import type { AuthFormState } from "@/features/auth/types";
import { AuthFormFeedback } from "@/features/auth/components/auth-form-feedback";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function ResetPasswordForm() {
  const router = useRouter();
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

      router.replace("/login?reset=success");
      router.refresh();
    });
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-6">
        <AuthFormFeedback error="This reset link is missing its token. Request a new password reset email." />
        <Button asChild size="lg">
          <Link href="/forgot-password">Request a new reset link</Link>
        </Button>
      </div>
    );
  }

  const passwordError = getFieldError(state.fieldErrors, "password");
  const confirmPasswordError = getFieldError(state.fieldErrors, "confirmPassword");

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <AuthFormFeedback error={state.error} success={state.success} />

      <FieldGroup>
        <Field data-invalid={Boolean(passwordError) || undefined}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <FieldContent>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter a new password"
              aria-invalid={Boolean(passwordError) || undefined}
              disabled={isPending}
            />
            <FieldDescription>
              Use at least 8 characters and avoid reusing an old password.
            </FieldDescription>
            <FieldError
              errors={passwordError ? [{ message: passwordError }] : undefined}
            />
          </FieldContent>
        </Field>

        <Field data-invalid={Boolean(confirmPasswordError) || undefined}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <FieldContent>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your new password"
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

      <Button disabled={isPending} type="submit" size="lg">
        {isPending ? "Updating password..." : "Reset password"}
      </Button>

      <Separator />

      <p className="text-sm text-muted-foreground">
        Need a fresh link?{" "}
        <Link
          className="text-foreground underline underline-offset-4"
          href="/forgot-password"
        >
          Request another reset email
        </Link>
      </p>
    </form>
  );
}
