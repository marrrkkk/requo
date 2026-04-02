import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      badge="Recovery"
      title="Request a password reset."
      description="Enter the email on your owner account and QuoteFlow will send a reset link when email delivery is configured."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
