"use client";

import { useMemo, useState } from "react";
import { Copy, MailPlus, Trash2, UserMinus, Users } from "lucide-react";

import type { BusinessMembersSettingsView } from "@/features/business-members/types";
import type {
  BusinessMemberInviteActionState,
  BusinessMemberAction,
} from "@/features/business-members/action-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { businessMemberRoleMeta, type BusinessMemberRole } from "@/lib/business-members";
import { getBusinessMemberInvitePath } from "@/features/businesses/routes";

type MembersManagerProps = {
  view: BusinessMembersSettingsView;
  createInviteAction: BusinessMemberAction;
  cancelInviteAction: BusinessMemberAction;
  updateRoleAction: BusinessMemberAction;
  removeMemberAction: BusinessMemberAction;
};

const initialState: BusinessMemberInviteActionState = {};

export function BusinessMembersManager({
  view,
  createInviteAction,
  cancelInviteAction,
  updateRoleAction,
  removeMemberAction,
}: MembersManagerProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<BusinessMemberRole, "owner">>("staff");

  const [inviteState, inviteFormAction, isInvitePending] = useActionStateWithSonner(
    createInviteAction,
    initialState,
  );
  const [, cancelInviteFormAction] = useActionStateWithSonner(
    cancelInviteAction,
    initialState,
  );
  const [, updateRoleFormAction] = useActionStateWithSonner(
    updateRoleAction,
    initialState,
  );
  const [, removeMemberFormAction] = useActionStateWithSonner(
    removeMemberAction,
    initialState,
  );

  const inviteLink = useMemo(() => {
    const link = inviteState?.inviteLink;
    if (typeof link !== "string" || !link) {
      return null;
    }

    return link.startsWith("/") ? `${window.location.origin}${link}` : link;
  }, [inviteState?.inviteLink]);

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="section-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Invite a member
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Send an invite link to give someone access to this business.
            </p>
          </div>

          <form
            action={async (formData) => {
              formData.set("email", email);
              formData.set("role", role);
              await inviteFormAction(formData);
            }}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"
          >
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="member-invite-email">
                Email address
              </label>
              <Input
                id="member-invite-email"
                name="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isInvitePending}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="member-invite-role">
                Role
              </label>
              <select
                id="member-invite-role"
                name="role"
                className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                value={role}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setRole(nextValue === "manager" ? "manager" : "staff");
                }}
                disabled={isInvitePending}
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button disabled={isInvitePending} type="submit" className="w-full sm:w-auto">
                <MailPlus data-icon="inline-start" />
                Send invite
              </Button>
            </div>
          </form>

          {inviteLink ? (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Invite link</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{inviteLink}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await copyText(inviteLink);
                  }}
                >
                  <Copy data-icon="inline-start" />
                  Copy invite link
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {view.invites.length ? (
        <section className="section-panel p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Pending invites
                </h2>
                <p className="text-sm text-muted-foreground">
                  Copy links, resend by re-inviting, or cancel.
                </p>
              </div>
              <Badge variant="secondary">{view.invites.length}</Badge>
            </div>

            <div className="grid gap-3">
              {view.invites.map((invite) => {
                const inviteUrl = `${window.location.origin}${getBusinessMemberInvitePath(invite.token)}`;
                const roleLabel = businessMemberRoleMeta[invite.role].label;

                return (
                  <div
                    className="rounded-3xl border border-border/70 bg-background/70 px-4 py-4 shadow-sm"
                    key={invite.inviteId}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {invite.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {roleLabel} invite · expires{" "}
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => copyText(inviteUrl)}
                        >
                          <Copy data-icon="inline-start" />
                          Copy invite link
                        </Button>

                        <form action={cancelInviteFormAction}>
                          <input type="hidden" name="inviteId" value={invite.inviteId} />
                          <Button type="submit" variant="outline">
                            <Trash2 data-icon="inline-start" />
                            Cancel
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Members
              </h2>
              <p className="text-sm text-muted-foreground">
                Owners have full control. Managers can access operational settings.
              </p>
            </div>
            <Badge variant="secondary">{view.members.length}</Badge>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/50 shadow-sm">
            <div className="flex flex-col">
              {view.members.map((member, index) => {
                const roleMeta = businessMemberRoleMeta[member.role];
                const isOwner = member.role === "owner";

                return (
                  <div
                    key={member.membershipId}
                    className={index > 0 ? "border-t border-border/70" : undefined}
                  >
                    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <Avatar>
                          {member.image ? (
                            <AvatarImage alt={member.name} src={member.image} />
                          ) : null}
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                              {member.name}
                            </p>
                            <Badge variant={isOwner ? "secondary" : "outline"}>
                              {roleMeta.label}
                            </Badge>
                            {member.isCurrentUser ? (
                              <Badge variant="outline">You</Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {!isOwner ? (
                          <form action={updateRoleFormAction} className="flex items-center gap-2">
                            <input type="hidden" name="membershipId" value={member.membershipId} />
                            <input type="hidden" name="userId" value={member.userId} />
                            <select
                              className="h-9 rounded-lg border border-border/70 bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                              name="role"
                              defaultValue={member.role}
                            >
                              <option value="staff">Staff</option>
                              <option value="manager">Manager</option>
                            </select>
                            <Button type="submit" size="sm" variant="outline">
                              Save
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Owner access stays unchanged here.
                          </span>
                        )}

                        {!member.isCurrentUser && !isOwner ? (
                          <form action={removeMemberFormAction}>
                            <input type="hidden" name="membershipId" value={member.membershipId} />
                            <input type="hidden" name="userId" value={member.userId} />
                            <Button type="submit" size="sm" variant="outline">
                              <UserMinus data-icon="inline-start" />
                              Remove
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function BusinessMembersManagerFallback() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          className="rounded-3xl border border-border/70 bg-background/50 p-6"
          key={index}
        >
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="mt-2 h-4 w-64 rounded-md" />
          <Skeleton className="mt-5 h-10 w-full rounded-xl sm:w-48" />
        </div>
      ))}
    </div>
  );
}

