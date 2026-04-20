import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketingMobileNav } from "@/components/marketing/marketing-mobile-nav";
import { Button } from "@/components/ui/button";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { getOptionalSession } from "@/lib/auth/session";

export async function PublicHeaderActions() {
  const session = await getOptionalSession();

  return session?.user ? (
    <>
      <Button asChild className="hidden sm:inline-flex lg:hidden" size="sm">
        <Link href={workspacesHubPath}>
          Visit app
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
      <Button asChild className="hidden lg:inline-flex">
        <Link href={workspacesHubPath}>
          Visit app
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
      <MarketingMobileNav isAuthenticated={true} />
    </>
  ) : (
    <PublicHeaderActionsSignedOut />
  );
}

export function PublicHeaderActionsFallback() {
  return (
    <>
      <div className="hidden h-9 w-24 rounded-md border border-border/60 bg-muted/25 sm:block lg:hidden" />
      <div className="hidden h-10 w-28 rounded-md border border-border/60 bg-muted/25 lg:block" />
      <div className="size-12 rounded-lg border border-border/60 bg-muted/25 lg:hidden" />
    </>
  );
}

export function PublicHeaderActionsSignedOut() {
  return (
    <>
      <Button
        asChild
        className="hidden sm:inline-flex lg:hidden"
        size="sm"
        variant="ghost"
      >
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild className="hidden lg:inline-flex" variant="ghost">
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild className="hidden sm:inline-flex lg:hidden" size="sm">
        <Link href="/signup">
          Start free
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
      <Button asChild className="hidden lg:inline-flex">
        <Link href="/signup">
          Start free
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
      <MarketingMobileNav isAuthenticated={false} />
    </>
  );
}
