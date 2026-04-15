import Link from "next/link";

import { AuthShell } from "@/components/shell/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { acceptBusinessMemberInviteAction, declineBusinessMemberInviteAction } from "@/features/business-members/actions";
import { BusinessMemberInviteAcceptForm } from "@/features/business-members/components/business-member-invite-accept-form";
import { getBusinessMemberInviteByToken } from "@/features/business-members/queries";
import { getBusinessMemberInvitePath } from "@/features/business-members/routes";
import { getAuthPathWithNext } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/auth/session";
import { businessMemberRoleMeta } from "@/lib/business-members";

export const unstable_instant = false;

function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

export default async function BusinessMemberInvitePage({
  params,
}: {
  params: Promise<{
    token: string;
  }>;
}) {
  const { token } = await params;
  const invitePath = getBusinessMemberInvitePath(token);
  const [currentUser, invite] = await Promise.all([
    getCurrentUser(),
    getBusinessMemberInviteByToken(token),
  ]);
  const isExpired = invite ? invite.expiresAt <= new Date() : false;

  if (!invite || isExpired) {
    return (
      <AuthShell
        badge="Invite"
        description="Ask the business owner for a fresh link if this one has expired."
        layout="centered"
        title="Invite unavailable"
      >
        <div className="flex flex-col gap-4 text-sm leading-7 text-muted-foreground">
          <p>This invite link is missing, expired, or has already been used.</p>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  const loginHref = getAuthPathWithNext("/login", invitePath);
  const signupHref = getAuthPathWithNext("/signup", invitePath);
  const invitedEmail = normalizeEmailAddress(invite.email);
  const signedInEmail = currentUser ? normalizeEmailAddress(currentUser.email) : null;

  if (!currentUser) {
    return (
      <AuthShell
        badge="Invite"
        description={`You've been invited to join ${invite.business.name} as a ${businessMemberRoleMeta[invite.role].label.toLowerCase()}.`}
        layout="centered"
        title={`Join ${invite.business.name}`}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{businessMemberRoleMeta[invite.role].label}</Badge>
            <Badge variant="outline">{invite.email}</Badge>
          </div>

          <p className="text-sm leading-7 text-muted-foreground">
            {invite.inviter.name} invited you to help manage inquiries, quotes, and follow-up for this business.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link href={loginHref}>Sign in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={signupHref}>Create account</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (signedInEmail !== invitedEmail) {
    return (
      <AuthShell
        badge="Invite"
        description="This invite is tied to a specific email address."
        layout="centered"
        title="Use the invited email"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 text-sm leading-7 text-muted-foreground">
            <p>Signed in as {currentUser.email}</p>
            <p>This invite was sent to {invite.email}.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <LogoutButton />
            <Button asChild variant="outline">
              <Link href={loginHref}>Sign in with another email</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  const alreadyHasAccess = Boolean(invite.currentMembershipRole);

  return (
    <AuthShell
      badge="Invite"
      description={
        alreadyHasAccess
          ? `You already have access to ${invite.business.name}.`
          : `Accept access to ${invite.business.name} as a ${businessMemberRoleMeta[invite.role].label.toLowerCase()}.`
      }
      layout="centered"
      title={alreadyHasAccess ? "Open business" : `Join ${invite.business.name}`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{businessMemberRoleMeta[invite.role].label}</Badge>
          <Badge variant="outline">{invite.email}</Badge>
        </div>

        <p className="text-sm leading-7 text-muted-foreground">
          {invite.inviter.name} invited you to help manage inquiries, quotes, and follow-up for this business.
        </p>

        <BusinessMemberInviteAcceptForm
          acceptAction={acceptBusinessMemberInviteAction.bind(null, invite.token)}
          declineAction={alreadyHasAccess ? undefined : declineBusinessMemberInviteAction.bind(null, invite.token)}
          submitLabel={alreadyHasAccess ? "Open business" : "Accept invite"}
        />
      </div>
    </AuthShell>
  );
}
