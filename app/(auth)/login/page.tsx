import { LoginForm } from "@/features/auth/components/login-form";
import type { SocialAuthProvider } from "@/features/auth/components/social-auth-buttons";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  const socialProviders: SocialAuthProvider[] = ["google", "microsoft"];

  return (
    <AuthShell badge="Log in" title="Sign in" layout="centered">
      <LoginForm socialProviders={socialProviders} />
    </AuthShell>
  );
}
