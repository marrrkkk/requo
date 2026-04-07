import { LoginForm } from "@/features/auth/components/login-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell badge="Log in" title="Sign in" layout="centered">
      <LoginForm />
    </AuthShell>
  );
}
