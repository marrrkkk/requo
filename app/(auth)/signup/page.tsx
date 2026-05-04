import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthShell } from "@/components/shell/auth-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import type { SocialAuthProvider } from "@/features/auth/components/social-auth-buttons";
import { getAccountProfileForUser } from "@/features/account/queries";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import { onboardingPath } from "@/features/onboarding/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { getOptionalSession } from "@/lib/auth/session";
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
  // Server-side redirect for already-authenticated users — avoids client-side flash
  const session = await getOptionalSession();
  if (session) {
    const [memberships, profile] = await Promise.all([
      getBusinessMembershipsForUser(session.user.id),
      getAccountProfileForUser(session.user.id),
    ]);
    const hasOnboarded =
      memberships.length > 0 || Boolean(profile?.onboardingCompletedAt);
    redirect(hasOnboarded ? workspacesHubPath : onboardingPath);
  }

  const socialProviders: SocialAuthProvider[] = ["google", "microsoft"];

  return (
    <AuthShell
      title="Create your account"
      description="Start managing inquiries and quotes in one place."
      layout="signup"
    >
      <SignupForm socialProviders={socialProviders} />
    </AuthShell>
  );
}
