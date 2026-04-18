import type { Metadata } from "next";

import { AuthShell } from "@/components/shell/auth-shell";
import { AuthenticatedPageRedirect } from "@/features/auth/components/authenticated-page-redirect";
import { SignupForm } from "@/features/auth/components/signup-form";
import type { SocialAuthProvider } from "@/features/auth/components/social-auth-buttons";
import { onboardingPath } from "@/features/onboarding/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { getSafeAuthRedirectPath } from "@/lib/auth/redirects";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description:
    "Create a Requo account to manage inquiries, send quotes, and follow up in one place.",
  noIndex: true,
  title: "Create account",
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}) {
  await redirectIfAuthenticated(workspacesHubPath);

  const { next } = await searchParams;
  const nextPath = getSafeAuthRedirectPath(
    typeof next === "string" ? next : next?.[0],
    onboardingPath,
  );

  const socialProviders: SocialAuthProvider[] = ["google", "microsoft"];

  return (
    <AuthShell badge="Sign up" title="Create account" layout="signup">
      <AuthenticatedPageRedirect redirectTo={nextPath} />
      <SignupForm socialProviders={socialProviders} />
    </AuthShell>
  );
}
