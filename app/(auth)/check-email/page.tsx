import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";

import { AuthShell } from "@/components/shell/auth-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = createNoIndexMetadata({
  description: "Check your email inbox to verify your Requo account.",
  title: "Check your email",
});

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[];
    reason?: string | string[];
  }>;
}) {
  const { email, reason } = await searchParams;
  const emailAddress = typeof email === "string" ? email : undefined;
  const emailReason =
    typeof reason === "string" ? reason : reason?.[0];
  const isMagicLink = emailReason === "magic-link";

  return (
    <AuthShell
      badge={isMagicLink ? "Sign in link" : "Verify email"}
      title="Check your inbox"
      layout="centered"
    >
      <div className="flex flex-col items-center justify-center gap-5 pt-2 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <MailCheck className="size-7 text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-6 text-muted-foreground">
            We sent{" "}
            {isMagicLink ? "a one-time sign-in link" : "a verification link"}{" "}
            to{" "}
            {emailAddress ? (
              <span className="font-medium text-foreground">{emailAddress}</span>
            ) : (
              "your email address"
            )}
            .{" "}
            {isMagicLink
              ? "Open the link on this device to sign in—it expires shortly."
              : "Click the link to verify your account and sign in."}
          </p>
        </div>
        <div className="mt-4 w-full">
          <Button asChild className="w-full" variant="outline" size="lg">
            <Link href="/login">Return to login</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
