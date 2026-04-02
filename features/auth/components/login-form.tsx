"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage, getFieldError, getValidationState } from "@/features/auth/utils";
import { loginSchema } from "@/features/auth/schemas";
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

const resetSuccessMessage =
  "Your password has been updated. Sign in with your new password.";

export function LoginForm() {
  const router = useRouter();
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

      router.replace("/dashboard");
      router.refresh();
    });
  }

  const emailError = getFieldError(state.fieldErrors, "email");
  const passwordError = getFieldError(state.fieldErrors, "password");

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <AuthFormFeedback error={state.error} success={state.success ?? resetMessage} />

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
          <FieldLabel htmlFor="password">Password</FieldLabel>
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
            <FieldDescription>
              Use the password for your QuoteFlow owner account.
            </FieldDescription>
            <FieldError
              errors={passwordError ? [{ message: passwordError }] : undefined}
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-3">
        <Button disabled={isPending} type="submit" size="lg">
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/forgot-password">Forgot your password?</Link>
        </Button>
      </div>

      <Separator />

      <p className="text-sm text-muted-foreground">
        New to QuoteFlow?{" "}
        <Link className="text-foreground underline underline-offset-4" href="/signup">
          Create an account
        </Link>
      </p>
    </form>
  );
}
