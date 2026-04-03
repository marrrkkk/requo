"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage, getFieldError, getValidationState } from "@/features/auth/utils";
import { loginSchema } from "@/features/auth/schemas";
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
import { Separator } from "@/components/ui/separator";

const resetSuccessMessage =
  "Your password has been updated. Sign in with your new password.";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<AuthFormState>({});
  const [isPending, startTransition] = useTransition();

  const resetMessage =
    searchParams.get("reset") === "success" ? resetSuccessMessage : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const validationResult = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validationResult.success) {
      setState(getValidationState(validationResult.error));
      return;
    }

    setState({});

    startTransition(async () => {
      const result = await authClient.signIn.email(validationResult.data);

      if (result.error) {
        setState({
          error: getAuthErrorMessage(
            result.error,
            "Your email or password is incorrect.",
          ),
        });
        return;
      }

      window.location.assign("/dashboard");
    });
  }

  const emailError = getFieldError(state.fieldErrors, "email");
  const passwordError = getFieldError(state.fieldErrors, "password");

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <AuthFormFeedback
        error={state.error}
        success={state.success ?? resetMessage}
        successTitle={resetMessage ? "Password updated" : undefined}
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
              placeholder="owner@example.com"
              aria-invalid={Boolean(emailError) || undefined}
              disabled={isPending}
            />
            <FieldError errors={emailError ? [{ message: emailError }] : undefined} />
          </FieldContent>
        </Field>

        <Field data-invalid={Boolean(passwordError) || undefined}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
          <FieldContent>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={Boolean(passwordError) || undefined}
              disabled={isPending}
            />
            <FieldError
              errors={passwordError ? [{ message: passwordError }] : undefined}
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <FormActions className="items-stretch sm:items-stretch">
        <Button className="w-full" disabled={isPending} type="submit" size="lg">
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </FormActions>

      <Separator />

      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link className="font-medium text-foreground underline underline-offset-4" href="/signup">
          Create an account
        </Link>
      </p>
    </form>
  );
}
