import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function ResetPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell badge="Reset" title="Choose a new password">
      <ResetPasswordForm />
    </AuthShell>
  );
}
