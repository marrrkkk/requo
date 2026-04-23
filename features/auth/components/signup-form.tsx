"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { getAuthPathWithNext, getSafeAuthRedirectPath } from "@/lib/auth/redirects";
import {
  AuthEmailDivider,
  SocialAuthButtons,
  type SocialAuthProvider,
} from "@/features/auth/components/social-auth-buttons";
import { getAuthErrorMessage, getFieldError, getValidationState } from "@/features/auth/utils";
import { signupSchema } from "@/features/auth/schemas";
import type { AuthFormState } from "@/features/auth/types";
import { AuthFormFeedback } from "@/features/auth/components/auth-form-feedback";
import { onboardingPath } from "@/features/onboarding/routes";
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

type SignupFormProps = {
  socialProviders?: SocialAuthProvider[];
};

export function SignupForm({
  socialProviders = [],
}: SignupFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextPath = getSafeAuthRedirectPath(searchParams.get("next"), onboardingPath);
  const loginHref = getAuthPathWithNext("/login", nextPath);
  const [state, setState] = useState<AuthFormState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

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
    const verificationCallback = `/login?verified=success&next=${encodeURIComponent(nextPath)}`;

    startTransition(async () => {
      const result = await authClient.signUp.email({
        ...validationResult.data,
        callbackURL: verificationCallback,
      });

      if (result.error) {
        setState({
          error: getAuthErrorMessage(
            result.error,
            "We couldn't create your account. Try a different email address.",
          ),
        });
        return;
      }

      form.reset();
      router.push(`/check-email?email=${encodeURIComponent(validationResult.data.email)}`);
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

  const nameError = getFieldError(state.fieldErrors, "name");
  const emailError = getFieldError(state.fieldErrors, "email");
  const passwordError = getFieldError(state.fieldErrors, "password");

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <AuthFormFeedback error={state.error} success={state.success} />

      <SocialAuthButtons
        disabled={isPending}
        onProviderClick={handleSocialSignIn}
        providers={socialProviders}
      />

      <AuthEmailDivider />

      <FieldGroup>
        <Field data-invalid={Boolean(nameError) || undefined}>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <FieldContent>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              maxLength={120}
              minLength={2}
              placeholder="Alicia Cruz"
              required
              aria-invalid={Boolean(nameError) || undefined}
              disabled={isPending}
            />
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
          <FieldLabel htmlFor="password">Password</FieldLabel>
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
      </FieldGroup>

      <FormActions className="items-stretch sm:items-stretch">
        <Button className="w-full" disabled={isPending} type="submit" size="lg">
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Creating your account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </FormActions>

      <p className="pt-1 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={loginHref}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
