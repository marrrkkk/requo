import type { Metadata } from "next";

import { AuthShell } from "@/components/shell/auth-shell";
import { AuthenticatedPageRedirect } from "@/features/auth/components/authenticated-page-redirect";
import { LoginForm } from "@/features/auth/components/login-form";
import type { SocialAuthProvider } from "@/features/auth/components/social-auth-buttons";
import { getSafeAuthRedirectPath } from "@/lib/auth/redirects";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description: "Log in to Requo to manage inquiries, quotes, and follow-up.",
  noIndex: true,
  title: "Log in",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}) {
  const { next } = await searchParams;
  const nextPath = getSafeAuthRedirectPath(
    typeof next === "string" ? next : next?.[0],
    "/workspaces",
  );

  const socialProviders: SocialAuthProvider[] = ["google", "microsoft"];

  return (
    <AuthShell badge="Log in" title="Sign in" layout="centered">
      <AuthenticatedPageRedirect redirectTo={nextPath} />
      <LoginForm socialProviders={socialProviders} />
    </AuthShell>
  );
}
