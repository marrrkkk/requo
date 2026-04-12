"use client";

import { useState } from "react";
import { MailPlus, UserMinus, Users } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  businessMemberAssignableRoles,
  businessMemberRoleMeta,
  type BusinessMemberAssignableRole,
} from "@/lib/business-members";
import { CopyBusinessInviteLinkButton } from "@/features/business-members/components/copy-business-invite-link-button";
import type {
  BusinessMemberInviteActionState,
  BusinessMemberRemoveActionState,
  BusinessMemberRoleActionState,
  BusinessMembersSettingsView,
} from "@/features/business-members/types";

type BusinessMembersManagerProps = {
  businessSlug: string;
  view: BusinessMembersSettingsView;
  createInviteAction: (
    state: BusinessMemberInviteActionState,
    formData: FormData,
  ) => Promise<BusinessMemberInviteActionState>;
  updateRoleAction: (
    membershipId: string,
    state: BusinessMemberRoleActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRoleActionState>;
  removeMemberAction: (
    membershipId: string,
    state: BusinessMemberRemoveActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRemoveActionState>;
  cancelInviteAction: (
    inviteId: string,
    state: BusinessMemberRemoveActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRemoveActionState>;
};

type RoleOption = {
  label: string;
  searchText: string;
  value: BusinessMemberAssignableRole;
};

const roleOptions: RoleOption[] = businessMemberAssignableRoles.map((role) => ({
  label: businessMemberRoleMeta[role].label,
  searchText: `${businessMemberRoleMeta[role].label} ${businessMemberRoleMeta[role].description}`,
  value: role,
}));

const initialInviteState: BusinessMemberInviteActionState = {};
const initialRoleState: BusinessMemberRoleActionState = {};
const initialDangerState: BusinessMemberRemoveActionState = {};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function BusinessMembersManager({
  businessSlug,
  view,
  createInviteAction,
  updateRoleAction,
  removeMemberAction,
  cancelInviteAction,
}: BusinessMembersManagerProps) {
  const memberCountLabel = `${view.members.length} member${
    view.members.length === 1 ? "" : "s"
  }`;
  const pendingInviteLabel = `${view.invites.length} pending invite${
    view.invites.length === 1 ? "" : "s"
  }`;

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-7">
      <div className="self-start xl:sticky xl:top-6">
        <div className="soft-panel flex flex-col gap-5 p-5 shadow-none sm:p-6">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Members
            </p>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Business access
              </h2>
              <p className="text-sm text-muted-foreground">
                Invite an admin, estimator, or teammate to help manage inquiries and quotes.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-5 py-5">
            <div className="grid gap-4">
              <SummaryRow label="Current members" value={memberCountLabel} />
              <SummaryRow label="Pending invites" value={pendingInviteLabel} />
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-4 py-4">
            <p className="text-sm font-medium text-foreground">Keep it simple.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Owners manage members. Managers help run the workspace. Staff handle inquiries and quotes.
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <DashboardSection
          description="Invite one person at a time and pick the access level they need."
          title="Invite member"
        >
          <InviteMemberForm
            action={createInviteAction}
            businessSlug={businessSlug}
          />
        </DashboardSection>

        <DashboardSection
          description="Owners always keep full control. Membership changes stay business-specific."
          title="Current members"
        >
          {view.members.length ? (
            <div className="flex flex-col gap-4">
              {view.members.map((member) => (
                <MemberRow
                  businessSlug={businessSlug}
                  key={member.membershipId}
                  member={member}
                  removeAction={removeMemberAction.bind(null, member.membershipId)}
                  updateRoleAction={updateRoleAction.bind(null, member.membershipId)}
                />
              ))}
            </div>
          ) : (
            <DashboardEmptyState
              description="Invite your first teammate to share inquiry and quote work."
              icon={Users}
              title="No members yet"
              variant="section"
            />
          )}
        </DashboardSection>

        <DashboardSection
          description="Pending invites stay active until they are accepted or canceled."
          title="Pending invites"
        >
          {view.invites.length ? (
            <div className="flex flex-col gap-4">
              {view.invites.map((invite) => (
                <InviteRow
                  businessSlug={businessSlug}
                  key={invite.inviteId}
                  invite={invite}
                  cancelAction={cancelInviteAction.bind(null, invite.inviteId)}
                />
              ))}
            </div>
          ) : (
            <DashboardEmptyState
              description="Send an invite when you want someone else to help manage this workspace."
              icon={MailPlus}
              title="No pending invites"
              variant="section"
            />
          )}
        </DashboardSection>
      </div>
    </div>
  );
}

function InviteMemberForm({
  businessSlug,
  action,
}: {
  businessSlug: string;
  action: BusinessMembersManagerProps["createInviteAction"];
}) {
  const [selectedRole, setSelectedRole] = useState<BusinessMemberAssignableRole>(
    "manager",
  );
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialInviteState,
  );
  const emailError = state.fieldErrors?.email?.[0];
  const roleError = state.fieldErrors?.role?.[0];
  const selectedRoleMeta = businessMemberRoleMeta[selectedRole];

  return (
    <form
      action={formAction}
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem_auto] lg:items-end"
    >
      <input name="businessSlug" type="hidden" value={businessSlug} />
      <input name="role" type="hidden" value={selectedRole} />

      <Field data-invalid={Boolean(emailError) || undefined}>
        <FieldLabel htmlFor="member-email">Email address</FieldLabel>
        <FieldContent>
          <Input
            autoComplete="email"
            disabled={isPending}
            id="member-email"
            name="email"
            placeholder="teammate@example.com"
            required
            type="email"
          />
          <FieldError errors={emailError ? [{ message: emailError }] : undefined} />
        </FieldContent>
      </Field>

      <Field data-invalid={Boolean(roleError) || undefined}>
        <FieldLabel htmlFor="member-role">Role</FieldLabel>
        <FieldContent>
          <Combobox
            disabled={isPending}
            id="member-role"
            onValueChange={(value) =>
              setSelectedRole(value as BusinessMemberAssignableRole)
            }
            options={roleOptions}
            placeholder="Choose a role"
            renderOption={(option) => (
              <div className="min-w-0">
                <p className="truncate font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {businessMemberRoleMeta[option.value].description}
                </p>
              </div>
            )}
            searchPlaceholder="Search member role"
            value={selectedRole}
          />
          <FieldDescription>{selectedRoleMeta.description}</FieldDescription>
          <FieldError errors={roleError ? [{ message: roleError }] : undefined} />
        </FieldContent>
      </Field>

      <Button disabled={isPending} type="submit">
        {isPending ? (
          <>
            <Spinner aria-hidden="true" data-icon="inline-start" />
            Sending...
          </>
        ) : (
          "Send invite"
        )}
      </Button>
    </form>
  );
}

function MemberRow({
  businessSlug,
  member,
  updateRoleAction,
  removeAction,
}: {
  businessSlug: string;
  member: BusinessMembersSettingsView["members"][number];
  updateRoleAction: (
    state: BusinessMemberRoleActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRoleActionState>;
  removeAction: (
    state: BusinessMemberRemoveActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRemoveActionState>;
}) {
  const isEditable = member.role !== "owner" && !member.isCurrentUser;
  const editableRole = member.role === "owner" ? null : member.role;

  return (
    <div className="rounded-3xl border border-border/75 bg-card/97 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold tracking-tight text-foreground">
              {member.name}
            </p>
            <Badge variant={member.role === "owner" ? "secondary" : "outline"}>
              {businessMemberRoleMeta[member.role].label}
            </Badge>
            {member.isCurrentUser ? <Badge variant="outline">You</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{member.email}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Joined {formatDate(member.joinedAt)}
          </p>
        </div>

        {isEditable ? (
          <div className="w-full max-w-xl">
            <MemberRoleForm
              businessSlug={businessSlug}
              currentRole={editableRole!}
              removeAction={removeAction}
              updateRoleAction={updateRoleAction}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            {member.role === "owner"
              ? "Owner access stays unchanged here."
              : "You can't remove your own access from this screen."}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberRoleForm({
  businessSlug,
  currentRole,
  updateRoleAction,
  removeAction,
}: {
  businessSlug: string;
  currentRole: BusinessMemberAssignableRole;
  updateRoleAction: (
    state: BusinessMemberRoleActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRoleActionState>;
  removeAction: (
    state: BusinessMemberRemoveActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRemoveActionState>;
}) {
  const [selectedRole, setSelectedRole] = useState<BusinessMemberAssignableRole>(
    currentRole,
  );
  const [roleState, roleFormAction, isRolePending] = useActionStateWithSonner(
    updateRoleAction,
    initialRoleState,
  );
  const [, removeFormAction, isRemovePending] = useActionStateWithSonner(
    removeAction,
    initialDangerState,
  );

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <form
        action={roleFormAction}
        className="grid gap-3 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      >
        <input name="businessSlug" type="hidden" value={businessSlug} />
        <input name="role" type="hidden" value={selectedRole} />
        <Field data-invalid={Boolean(roleState.fieldErrors?.role?.[0]) || undefined}>
          <FieldLabel>Role</FieldLabel>
          <FieldContent>
            <Combobox
              disabled={isRolePending || isRemovePending}
              id={`member-role-${currentRole}`}
              onValueChange={(value) =>
                setSelectedRole(value as BusinessMemberAssignableRole)
              }
              options={roleOptions}
              placeholder="Choose a role"
              renderOption={(option) => (
                <div className="min-w-0">
                  <p className="truncate font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {businessMemberRoleMeta[option.value].description}
                  </p>
                </div>
              )}
              searchPlaceholder="Search member role"
              value={selectedRole}
            />
            <FieldError
              errors={
                roleState.fieldErrors?.role?.[0]
                  ? [{ message: roleState.fieldErrors.role[0] }]
                  : undefined
              }
            />
          </FieldContent>
        </Field>

        <Button disabled={isRolePending || isRemovePending} type="submit" variant="outline">
          {isRolePending ? (
            <>
              <Spinner aria-hidden="true" data-icon="inline-start" />
              Saving...
            </>
          ) : (
            "Save role"
          )}
        </Button>
      </form>

      <form action={removeFormAction}>
        <input name="businessSlug" type="hidden" value={businessSlug} />
        <Button
          className="w-full"
          disabled={isRolePending || isRemovePending}
          type="submit"
          variant="outline"
        >
          {isRemovePending ? (
            <>
              <Spinner aria-hidden="true" data-icon="inline-start" />
              Removing...
            </>
          ) : (
            <>
              <UserMinus data-icon="inline-start" />
              Remove
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function InviteRow({
  businessSlug,
  invite,
  cancelAction,
}: {
  businessSlug: string;
  invite: BusinessMembersSettingsView["invites"][number];
  cancelAction: (
    state: BusinessMemberRemoveActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRemoveActionState>;
}) {
  const [, cancelFormAction, isPending] = useActionStateWithSonner(
    cancelAction,
    initialDangerState,
  );

  return (
    <div className="rounded-3xl border border-border/75 bg-card/97 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold tracking-tight text-foreground">
              {invite.email}
            </p>
            <Badge variant="outline">
              {businessMemberRoleMeta[invite.role].label}
            </Badge>
            <Badge variant="secondary">Pending</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Sent by {invite.inviterName}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Sent {formatDate(invite.createdAt)} / Expires {formatDate(invite.expiresAt)}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <CopyBusinessInviteLinkButton inviteUrl={invite.inviteUrl} />

          <form action={cancelFormAction}>
            <input name="businessSlug" type="hidden" value={businessSlug} />
            <Button disabled={isPending} type="submit" variant="outline">
              {isPending ? (
                <>
                  <Spinner aria-hidden="true" data-icon="inline-start" />
                  Canceling...
                </>
              ) : (
                "Cancel invite"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
