import type { Metadata } from "next";

import { AuthShell } from "@/components/shell/auth-shell";
import { AuthenticatedPageRedirect } from "@/features/auth/components/authenticated-page-redirect";
import { businessesHubPath } from "@/features/businesses/routes";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  description: "Set a new password for your Requo account.",
  title: "Choose a new password",
});

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      badge="New password"
      title="Choose a new password"
      layout="centered"
    >
      <AuthenticatedPageRedirect redirectTo={businessesHubPath} />
      <ResetPasswordForm />
    </AuthShell>
  );
}
