"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { getAuthPathWithNext, getSafeAuthRedirectPath } from "@/lib/auth/redirects";
import {
  AuthEmailDivider,
  SocialAuthButtons,
  type SocialAuthProvider,
} from "@/features/auth/components/social-auth-buttons";
import { getAuthErrorMessage, getFieldError, getValidationState } from "@/features/auth/utils";
import { loginSchema } from "@/features/auth/schemas";
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
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/features/auth/components/password-input";

const resetSuccessMessage =
  "Your password has been updated. Sign in with your new password.";

type LoginFormProps = {
  socialProviders?: SocialAuthProvider[];
};

export function LoginForm({
  socialProviders = [],
}: LoginFormProps) {
  const searchParams = useSearchParams();
  const nextPath = getSafeAuthRedirectPath(searchParams.get("next"), "/workspaces");
  const signupHref = getAuthPathWithNext("/signup", nextPath);
  const [state, setState] = useState<AuthFormState>({});
  const [isPending, startTransition] = useTransition();

  const resetMessage =
    searchParams.get("reset") === "success" ? resetSuccessMessage : undefined;
  const verifiedMessage =
    searchParams.get("verified") === "success"
      ? "Your email is verified. Sign in to continue."
      : undefined;

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
      const result = await authClient.signIn.email({
        ...validationResult.data,
        callbackURL: nextPath,
      });

      if (result.error) {
        setState({
          error: getAuthErrorMessage(
            result.error,
            "Your email or password is incorrect.",
          ),
        });
        return;
      }

      window.location.assign(nextPath);
    });
  }

  function handleSocialSignIn(provider: SocialAuthProvider) {
    setState({});

    startTransition(async () => {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: nextPath,
        newUserCallbackURL: nextPath,
      });

      if (result.error) {
        setState({
          error: getAuthErrorMessage(
            result.error,
            `We couldn't continue with ${provider} right now.`,
          ),
        });
      }
    });
  }

  const emailError = getFieldError(state.fieldErrors, "email");
  const passwordError = getFieldError(state.fieldErrors, "password");

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <AuthFormFeedback
        error={state.error}
        success={state.success ?? verifiedMessage ?? resetMessage}
        successTitle={
          verifiedMessage
            ? "Email verified"
            : resetMessage
              ? "Password updated"
              : undefined
        }
      />

      <SocialAuthButtons
        disabled={isPending}
        onProviderClick={handleSocialSignIn}
        providers={socialProviders}
      />

      <AuthEmailDivider />

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
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              maxLength={128}
              minLength={8}
              placeholder="Enter your password"
              required
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
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </FormActions>

      <p className="pt-1 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={signupHref}
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
