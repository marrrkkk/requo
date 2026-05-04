import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/shell/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import {
  acceptWorkspaceMemberInviteAction,
  declineWorkspaceMemberInviteAction,
} from "@/features/workspace-members/actions";
import { WorkspaceMemberInviteAcceptForm } from "@/features/workspace-members/components/workspace-member-invite-accept-form";
import { getWorkspaceMemberInviteByToken } from "@/features/workspace-members/queries";
import { getWorkspaceMemberInvitePath } from "@/features/workspace-members/routes";
import { workspaceMemberRoleMeta } from "@/features/workspace-members/types";
import { getAuthPathWithNext } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const unstable_instant = false;
export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Workspace invite",
  description: "Review a workspace access invite securely.",
});

function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

export default async function WorkspaceMemberInvitePage({
  params,
}: {
  params: Promise<{
    token: string;
  }>;
}) {
  const { token } = await params;
  const invitePath = getWorkspaceMemberInvitePath(token);
  const [currentUser, invite] = await Promise.all([
    getCurrentUser(),
    getWorkspaceMemberInviteByToken(token),
  ]);
  const isExpired = invite ? invite.expiresAt <= new Date() : false;

  if (!invite || isExpired) {
    return (
      <AuthShell
        badge="Invite"
        description="Ask the workspace owner for a fresh link if this one has expired."
        layout="centered"
        title="Invite unavailable"
      >
        <div className="flex flex-col gap-4 text-sm leading-normal sm:leading-7 text-muted-foreground">
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
  const inviteRoleMeta = workspaceMemberRoleMeta[invite.workspaceRole];
  const signedInEmail = currentUser
    ? normalizeEmailAddress(currentUser.email)
    : null;

  if (!currentUser) {
    return (
      <AuthShell
        badge="Invite"
        description={`You've been invited to join ${invite.workspace.name} as a ${inviteRoleMeta.label.toLowerCase()}.`}
        layout="centered"
        title={`Join ${invite.workspace.name}`}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{inviteRoleMeta.label}</Badge>
            <Badge variant="outline">{invite.email}</Badge>
          </div>

          <p className="text-sm leading-normal sm:leading-7 text-muted-foreground">
            {invite.inviter.name} invited you to join this workspace and
            collaborate on inquiries, quotes, and follow-up.
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
          <div className="flex flex-col gap-2 text-sm leading-normal sm:leading-7 text-muted-foreground">
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

  const alreadyHasAccess = Boolean(invite.currentWorkspaceMembershipRole);

  return (
    <AuthShell
      badge="Invite"
      description={
        alreadyHasAccess
          ? `You already have access to ${invite.workspace.name}.`
          : `Accept access to ${invite.workspace.name} as a ${inviteRoleMeta.label.toLowerCase()}.`
      }
      layout="centered"
      title={
        alreadyHasAccess
          ? "Open workspace"
          : `Join ${invite.workspace.name}`
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{inviteRoleMeta.label}</Badge>
          <Badge variant="outline">{invite.email}</Badge>
        </div>

        <p className="text-sm leading-normal sm:leading-7 text-muted-foreground">
          {invite.inviter.name} invited you to join this workspace and
          collaborate on inquiries, quotes, and follow-up.
        </p>

        <WorkspaceMemberInviteAcceptForm
          acceptAction={acceptWorkspaceMemberInviteAction.bind(
            null,
            invite.token,
          )}
          declineAction={
            alreadyHasAccess
              ? undefined
              : declineWorkspaceMemberInviteAction.bind(null, invite.token)
          }
          submitLabel={
            alreadyHasAccess ? "Open workspace" : "Accept invite"
          }
        />
      </div>
    </AuthShell>
  );
}
