import { SignupForm } from "@/features/auth/components/signup-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function SignupPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      badge="Signup"
      title="Create your first QuoteFlow workspace."
      description="Create an owner account and QuoteFlow will provision your profile, workspace, and owner membership automatically."
    >
      <SignupForm />
    </AuthShell>
  );
}
