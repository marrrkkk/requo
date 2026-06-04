import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/shell/auth-shell";
import { dashboardPath } from "@/features/businesses/routes";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { getOptionalSession } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  description: "Request a password reset link for your Requo account.",
  title: "Reset your password",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell badge="Recovery" title="Reset password" layout="centered">
      <Suspense fallback={null}>
        <AuthRedirectGuard />
      </Suspense>
      <ForgotPasswordForm />
    </AuthShell>
  );
}

async function AuthRedirectGuard() {
  const session = await getOptionalSession();
  if (session) {
    redirect(dashboardPath);
  }
  return null;
}
