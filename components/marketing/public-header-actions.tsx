"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketingMobileNav } from "@/components/marketing/marketing-mobile-nav";
import { Button } from "@/components/ui/button";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { authClient } from "@/lib/auth/client";

export function PublicHeaderActions() {
  const { data: session } = authClient.useSession();
  const isAuthenticated = Boolean(session?.user);

  return isAuthenticated ? (
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
