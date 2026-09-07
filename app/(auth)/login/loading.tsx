import { AuthShell } from "@/components/shell/auth-shell";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";

export default function LoginLoading() {
  return (
    <AuthShell
      description="Sign in to your account to continue."
      layout="signup"
      title="Welcome back"
    >
      <AuthFormSkeleton />
    </AuthShell>
  );
}