import type { Metadata } from "next";

import { AuthShell } from "@/components/shell/auth-shell";
import { AuthenticatedPageRedirect } from "@/features/auth/components/authenticated-page-redirect";
import { businessesHubPath } from "@/features/businesses/routes";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description: "Request a password reset link for your Requo account.",
  noIndex: true,
  title: "Reset your password",
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell badge="Recovery" title="Reset password" layout="centered">
      <AuthenticatedPageRedirect redirectTo={businessesHubPath} />
      <ForgotPasswordForm />
    </AuthShell>
  );
}
