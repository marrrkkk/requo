import { AuthShell } from "@/components/shell/auth-shell";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";

export default function ResetPasswordLoading() {
  return (
    <AuthShell badge="New password" layout="centered" title="Choose a new password">
      <AuthFormSkeleton />
    </AuthShell>
  );
}