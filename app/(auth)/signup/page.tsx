import { SignupForm } from "@/features/auth/components/signup-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function SignupPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell badge="Sign up" title="Create account" layout="signup">
      <SignupForm />
    </AuthShell>
  );
}
