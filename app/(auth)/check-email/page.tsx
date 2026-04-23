import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";

import { AuthShell } from "@/components/shell/auth-shell";
import { createPageMetadata } from "@/lib/seo/site";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = createPageMetadata({
  description: "Check your email inbox to verify your Requo account.",
  noIndex: true,
  title: "Check your email",
});

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[];
  }>;
}) {
  const { email } = await searchParams;
  const emailAddress = typeof email === "string" ? email : undefined;

  return (
    <AuthShell
      badge="Verify email"
      title="Check your inbox"
      layout="centered"
    >
      <div className="flex flex-col items-center justify-center gap-5 pt-2 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <MailCheck className="size-7 text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-6 text-muted-foreground">
            We sent a verification link to{" "}
            {emailAddress ? (
              <span className="font-medium text-foreground">{emailAddress}</span>
            ) : (
              "your email address"
            )}
            . Click the link to verify your account and sign in.
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
