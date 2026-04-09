import { SignupForm } from "@/features/auth/components/signup-form";
import type { SocialAuthProvider } from "@/features/auth/components/social-auth-buttons";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function SignupPage() {
  await redirectIfAuthenticated();

  const socialProviders: SocialAuthProvider[] = ["google", "microsoft"];

  return (
    <AuthShell badge="Sign up" title="Create account" layout="signup">
      <SignupForm socialProviders={socialProviders} />
    </AuthShell>
  );
}
