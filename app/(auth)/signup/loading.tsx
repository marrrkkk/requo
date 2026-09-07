import { AuthShell } from "@/components/shell/auth-shell";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";

export default function SignupLoading() {
  return (
    <AuthShell
      description="Start managing inquiries and quotes in one place."
      layout="signup"
      title="Create your account"
    >
      <AuthFormSkeleton />
    </AuthShell>
  );
}