import { AuthShell } from "@/components/shell/auth-shell";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";

export default function AuthLoading() {
  return (
    <AuthShell badge="Account" layout="centered" title="Just a moment">
      <AuthFormSkeleton />
    </AuthShell>
  );
}