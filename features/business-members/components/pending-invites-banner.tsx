"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { PendingInviteForUser } from "@/features/business-members/queries";
import { businessMemberRoleMeta } from "@/lib/business-members";

type PendingInvitesBannerProps = {
  invites: PendingInviteForUser[];
  acceptAction: (token: string) => Promise<{ error?: string }>;
  declineAction: (inviteId: string) => Promise<{ error?: string }>;
};

export function PendingInvitesBanner({
  invites,
  acceptAction,
  declineAction,
}: PendingInvitesBannerProps) {
  if (invites.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <p className="meta-label">
        {invites.length} pending invite{invites.length === 1 ? "" : "s"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {invites.map((invite) => (
          <PendingInviteCard
            key={invite.inviteId}
            invite={invite}
            acceptAction={acceptAction}
            declineAction={declineAction}
          />
        ))}
      </div>
    </section>
  );
}

function PendingInviteCard({
  invite,
  acceptAction,
  declineAction,
}: {
  invite: PendingInviteForUser;
  acceptAction: (token: string) => Promise<{ error?: string }>;
  declineAction: (inviteId: string) => Promise<{ error?: string }>;
}) {
  const [isAccepting, startAccept] = useTransition();
  const [isDeclining, startDecline] = useTransition();
  const busy = isAccepting || isDeclining;

  const roleMeta = businessMemberRoleMeta[invite.role as keyof typeof businessMemberRoleMeta];

  function handleAccept() {
    startAccept(async () => {
      const result = await acceptAction(invite.token);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  function handleDecline() {
    startDecline(async () => {
      const result = await declineAction(invite.inviteId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Invite declined.");
      }
    });
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {invite.businessName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {invite.inviterName ? `Invited by ${invite.inviterName}` : "You've been invited"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {roleMeta?.label ?? invite.role}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Expires {new Date(invite.expiresAt).toLocaleDateString()}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            type="button"
            disabled={busy}
            onClick={handleAccept}
            className="flex-1"
          >
            <Check data-icon="inline-start" />
            Accept
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            disabled={busy}
            onClick={handleDecline}
            className="flex-1"
          >
            <X data-icon="inline-start" />
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
