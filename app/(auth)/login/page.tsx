import { LoginForm } from "@/features/auth/components/login-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { AuthShell } from "@/components/shell/auth-shell";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      badge="Login"
      title="Owner access starts here."
      description="Sign in with your QuoteFlow owner account to manage inquiries, quotes, knowledge, and workspace settings."
    >
      <LoginForm />
    </AuthShell>
  );
}
