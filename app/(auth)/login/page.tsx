import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthShell } from "@/components/shell/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import type { SocialAuthProvider } from "@/features/auth/components/social-auth-buttons";
import { getAccountProfileForUser } from "@/features/account/queries";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import { getSafeAuthRedirectPath } from "@/lib/auth/redirects";
import { getOptionalSession } from "@/lib/auth/session";
import { onboardingPath } from "@/features/onboarding/routes";
import { businessesHubPath } from "@/features/businesses/routes";
import { isEmailConfigured } from "@/lib/env";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  description: "Log in to Requo to manage inquiries, quotes, and follow-up.",
  title: "Log in",
});

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}) {
  const { next } = await searchParams;
  const rawNext = typeof next === "string" ? next : next?.[0];
  const nextPath = getSafeAuthRedirectPath(rawNext, businessesHubPath);

  // Server-side redirect for already-authenticated users — avoids client-side flash
  const session = await getOptionalSession();
  if (session) {
    const [memberships, profile] = await Promise.all([
      getBusinessMembershipsForUser(session.user.id),
      getAccountProfileForUser(session.user.id),
    ]);
    const hasOnboarded =
      memberships.length > 0 || Boolean(profile?.onboardingCompletedAt);
    redirect(hasOnboarded ? nextPath : onboardingPath);
  }

  const socialProviders: SocialAuthProvider[] = ["google"];

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your account to continue"
      layout="centered"
    >
      <LoginForm
        magicLinkEnabled={isEmailConfigured}
        socialProviders={socialProviders}
      />
    </AuthShell>
  );
}
