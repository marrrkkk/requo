import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function ResetPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      badge="Reset"
      title="Complete a password reset."
      description="Choose a new password for your QuoteFlow owner account. Reset links stay scoped to your email address and workspace."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
