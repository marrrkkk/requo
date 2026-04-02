"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage, getFieldError, getValidationState } from "@/features/auth/utils";
import { signupSchema } from "@/features/auth/schemas";
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

export function SignupForm() {
  const router = useRouter();
  const [state, setState] = useState<AuthFormState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const validationResult = signupSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validationResult.success) {
      setState(getValidationState(validationResult.error));
      return;
    }

    setState({});

    startTransition(async () => {
      const result = await authClient.signUp.email(validationResult.data);

      if (result.error) {
        setState({
          error: getAuthErrorMessage(
            result.error,
            "We couldn't create your account. Try a different email address.",
          ),
        });
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
  }

  const nameError = getFieldError(state.fieldErrors, "name");
  const emailError = getFieldError(state.fieldErrors, "email");
  const passwordError = getFieldError(state.fieldErrors, "password");

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <AuthFormFeedback error={state.error} success={state.success} />

      <FieldGroup>
        <Field data-invalid={Boolean(nameError) || undefined}>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <FieldContent>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Alicia Cruz"
              aria-invalid={Boolean(nameError) || undefined}
              disabled={isPending}
            />
            <FieldDescription>
              This becomes the default owner profile name.
            </FieldDescription>
            <FieldError errors={nameError ? [{ message: nameError }] : undefined} />
          </FieldContent>
        </Field>

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
              autoComplete="new-password"
              placeholder="Create a secure password"
              aria-invalid={Boolean(passwordError) || undefined}
              disabled={isPending}
            />
            <FieldDescription>
              Use at least 8 characters. Your workspace is created on first signup.
            </FieldDescription>
            <FieldError
              errors={passwordError ? [{ message: passwordError }] : undefined}
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <Button disabled={isPending} type="submit" size="lg">
        {isPending ? "Creating your account..." : "Create account"}
      </Button>

      <Separator />

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="text-foreground underline underline-offset-4" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
