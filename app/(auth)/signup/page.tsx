import { SignupForm } from "@/features/auth/components/signup-form";
import type { SocialAuthProvider } from "@/features/auth/components/social-auth-buttons";
import { onboardingPath } from "@/features/onboarding/routes";
import { getSafeAuthRedirectPath } from "@/lib/auth/redirects";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}) {
  const { next } = await searchParams;
  const nextPath = getSafeAuthRedirectPath(
    typeof next === "string" ? next : next?.[0],
    onboardingPath,
  );

  await redirectIfAuthenticated(nextPath);

  const socialProviders: SocialAuthProvider[] = ["google", "microsoft"];

  return (
    <AuthShell badge="Sign up" title="Create account" layout="signup">
      <SignupForm socialProviders={socialProviders} />
    </AuthShell>
  );
}
