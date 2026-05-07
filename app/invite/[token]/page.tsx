import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/shell/auth-shell";
import { Button } from "@/components/ui/button";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Business invite",
  description: "Review a business access invite securely.",
});

/**
 * TODO: Re-implement invite flow for business-only architecture.
 * The previous invite system was removed during the migration.
 * This page needs to be rebuilt with business-scoped invite logic.
 */
export default async function BusinessMemberInvitePage() {
  return (
    <AuthShell
      badge="Invite"
      description="This invite flow is being updated. Please contact the business owner for access."
      layout="centered"
      title="Invite unavailable"
    >
      <div className="flex flex-col gap-4 text-sm leading-normal sm:leading-7 text-muted-foreground">
        <p>
          The invite system is being updated. Please contact the business owner
          directly for access.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
