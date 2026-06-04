import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/shell/auth-shell";
import { dashboardPath } from "@/features/businesses/routes";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getOptionalSession } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  description: "Set a new password for your Requo account.",
  title: "Choose a new password",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
      searchParams: { token: "sample-reset-token" },
    },
  ],
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      badge="New password"
      title="Choose a new password"
      layout="centered"
    >
      <Suspense fallback={null}>
        <AuthRedirectGuard />
      </Suspense>
      <ResetPasswordForm />
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
