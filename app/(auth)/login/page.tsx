import { LoginForm } from "@/features/auth/components/login-form";
import type { SocialAuthProvider } from "@/features/auth/components/social-auth-buttons";
import { getSafeAuthRedirectPath } from "@/lib/auth/redirects";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

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

  await redirectIfAuthenticated(nextPath);

  const socialProviders: SocialAuthProvider[] = ["google", "microsoft"];

  return (
    <AuthShell badge="Log in" title="Sign in" layout="centered">
      <LoginForm socialProviders={socialProviders} />
    </AuthShell>
  );
}
