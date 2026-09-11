import { AuthShell } from "@/components/shell/auth-shell";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";

export default function ForgotPasswordLoading() {
  return (
    <AuthShell badge="Recovery" layout="centered" title="Reset password">
      <AuthFormSkeleton />
    </AuthShell>
  );
}