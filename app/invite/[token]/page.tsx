import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/shell/auth-shell";
import { Button } from "@/components/ui/button";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getOptionalSession } from "@/lib/auth/session";
import { timed } from "@/lib/dev/server-timing";
import { getBusinessMemberInvitePath } from "@/features/businesses/routes";
import { getBusinessMemberInviteForToken } from "@/features/business-members/queries";
import { acceptBusinessMemberInviteAction } from "@/features/business-members/actions";

const inviteFallbackMetadata = createNoIndexMetadata({
  absoluteTitle: "Business invite",
  description: "Review a business access invite securely.",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const invite = await getBusinessMemberInviteForToken(token);

  if (!invite) {
    return inviteFallbackMetadata;
  }

  return createNoIndexMetadata({
    absoluteTitle: `Join ${invite.businessName}`,
    description: `Accept your invite to access ${invite.businessName} on Requo.`,
  });
}

export default function BusinessMemberInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<BusinessMemberInviteFallback />}>
      <BusinessMemberInviteContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function BusinessMemberInviteContent({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const [{ token }, { error }] = await Promise.all([params, searchParams]);
  // Kick off invite + session lookups in parallel — independent queries.
  // Await both up front so a missing invite early-return doesn't leave the
  // session promise dangling (which would surface as an unhandled rejection
  // if it rejected).
  const [invite, session] = await timed(
    "invite.parallelInviteAndSession",
    Promise.all([
      getBusinessMemberInviteForToken(token),
      getOptionalSession(),
    ]),
  );

  if (!invite) {
    return (
      <AuthShell
        badge="Invite"
        description="This invite link is invalid or has expired."
        layout="centered"
        title="Invite not found"
      >
        <div className="flex flex-col gap-4 text-sm leading-normal sm:leading-7 text-muted-foreground">
          <p>Ask the business owner to send a fresh invite link.</p>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  const isSignedIn = Boolean(session);
  const inviteEmail = invite.email;
  const inviteError = typeof error === "string" ? error : error?.[0];

  if (!isSignedIn) {
    return (
      <AuthShell
        badge="Invite"
        description="Sign in to accept this business access invite."
        layout="centered"
        title={`Join ${invite.businessName}`}
      >
        <div className="flex flex-col gap-4 text-sm leading-normal sm:leading-7 text-muted-foreground">
          <p>
            This invite was sent to <span className="font-medium text-foreground">{inviteEmail}</span>.
          </p>
          <Button asChild>
            <Link href={`/login?next=${encodeURIComponent(getBusinessMemberInvitePath(token))}`}>
              Sign in
            </Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  // Signed in, but invite belongs to another email.
  if (session?.user?.email.toLowerCase() !== inviteEmail.toLowerCase()) {
    return (
      <AuthShell
        badge="Invite"
        description="This invite was sent to a different email address."
        layout="centered"
        title={`Join ${invite.businessName}`}
      >
        <div className="flex flex-col gap-4 text-sm leading-normal sm:leading-7 text-muted-foreground">
          <p>
            Signed in as{" "}
            <span className="font-medium text-foreground">{session?.user.email}</span>, but this invite is for{" "}
            <span className="font-medium text-foreground">{inviteEmail}</span>.
          </p>
          <Button asChild variant="outline">
            <Link href="/login">Use a different account</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="Invite"
      description="Accept this invite to get access to the business dashboard."
      layout="centered"
      title={`Join ${invite.businessName}`}
    >
      <div className="flex flex-col gap-4">
        {inviteError ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            That invite could not be accepted. Please ask for a new link.
          </div>
        ) : null}

        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <p>
            You&apos;re accepting access for <span className="font-medium text-foreground">{inviteEmail}</span>.
          </p>
        </div>

        <form action={acceptBusinessMemberInviteAction.bind(null, token)}>
          <Button className="w-full" size="lg" type="submit">
            Accept invite
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}

function BusinessMemberInviteFallback() {
  return (
    <AuthShell
      badge="Invite"
      description="Checking this business access invite."
      layout="centered"
      title="Loading invite"
    >
      <div className="flex flex-col gap-4">
        <div className="h-4 w-52 rounded-md bg-muted" />
        <div className="h-11 w-full rounded-lg bg-muted" />
      </div>
    </AuthShell>
  );
}
