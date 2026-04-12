"use client";

import { useState } from "react";
import { MailPlus, Plus, UserMinus, Users } from "lucide-react";

import { DashboardEmptyState } from "@/components/shared/dashboard-layout";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function BusinessMembersManager({
  businessSlug,
  view,
  createInviteAction,
  updateRoleAction,
  removeMemberAction,
  cancelInviteAction,
}: BusinessMembersManagerProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <InviteMemberDialog
          action={createInviteAction}
          businessSlug={businessSlug}
        />
        {view.invites.length > 0 ? (
          <PendingInvitesDialog
            businessSlug={businessSlug}
            cancelInviteAction={cancelInviteAction}
            invites={view.invites}
          />
        ) : null}
      </div>

      {/* Members list */}
      {view.members.length ? (
        <div className="flex flex-col gap-2">
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
          description="Invite your first teammate to get started."
          icon={Users}
          title="No members yet"
          variant="section"
        />
      )}
    </div>
  );
}

/* ─── Invite member dialog ─── */

function InviteMemberDialog({
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
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Send an invite to join this business.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input name="businessSlug" type="hidden" value={businessSlug} />
          <input name="role" type="hidden" value={selectedRole} />
          <DialogBody className="flex flex-col gap-4">
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
                  searchPlaceholder="Search role"
                  value={selectedRole}
                />
                <FieldDescription>{selectedRoleMeta.description}</FieldDescription>
                <FieldError errors={roleError ? [{ message: roleError }] : undefined} />
              </FieldContent>
            </Field>
          </DialogBody>
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Member row ─── */

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
    <div className="flex items-center gap-4 rounded-xl border border-border/75 bg-card/97 px-4 py-3.5">
      <Avatar>
        {member.image ? <AvatarImage alt={member.name} src={member.image} /> : null}
        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {member.name}
          </p>
          <Badge variant={member.role === "owner" ? "secondary" : "outline"}>
            {businessMemberRoleMeta[member.role].label}
          </Badge>
          {member.isCurrentUser ? <Badge variant="outline">You</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{member.email}</p>
      </div>

      {isEditable ? (
        <MemberRoleForm
          businessSlug={businessSlug}
          currentRole={editableRole!}
          removeAction={removeAction}
          updateRoleAction={updateRoleAction}
        />
      ) : null}
    </div>
  );
}

/* ─── Member role form ─── */

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
    <div className="flex shrink-0 items-center gap-2">
      <form
        action={roleFormAction}
        className="flex items-center gap-2"
      >
        <input name="businessSlug" type="hidden" value={businessSlug} />
        <input name="role" type="hidden" value={selectedRole} />
        <Combobox
          disabled={isRolePending || isRemovePending}
          id={`member-role-${currentRole}`}
          onValueChange={(value) =>
            setSelectedRole(value as BusinessMemberAssignableRole)
          }
          options={roleOptions}
          placeholder="Role"
          renderOption={(option) => (
            <div className="min-w-0">
              <p className="truncate font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground">
                {businessMemberRoleMeta[option.value].description}
              </p>
            </div>
          )}
          searchPlaceholder="Search role"
          value={selectedRole}
        />
        <FieldError
          errors={
            roleState.fieldErrors?.role?.[0]
              ? [{ message: roleState.fieldErrors.role[0] }]
              : undefined
          }
        />

        <Button disabled={isRolePending || isRemovePending} size="sm" type="submit" variant="outline">
          {isRolePending ? (
            <>
              <Spinner aria-hidden="true" data-icon="inline-start" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </form>

      <form action={removeFormAction}>
        <input name="businessSlug" type="hidden" value={businessSlug} />
        <Button
          disabled={isRolePending || isRemovePending}
          size="sm"
          type="submit"
          variant="outline"
        >
          {isRemovePending ? (
            <Spinner aria-hidden="true" />
          ) : (
            <UserMinus className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

/* ─── Pending invites dialog ─── */

function PendingInvitesDialog({
  businessSlug,
  invites,
  cancelInviteAction,
}: {
  businessSlug: string;
  invites: BusinessMembersSettingsView["invites"];
  cancelInviteAction: BusinessMembersManagerProps["cancelInviteAction"];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MailPlus data-icon="inline-start" />
          {invites.length} pending
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pending invites</DialogTitle>
          <DialogDescription>
            Invites stay active until accepted or canceled.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-2">
            {invites.map((invite) => (
              <InviteRow
                businessSlug={businessSlug}
                cancelAction={cancelInviteAction.bind(null, invite.inviteId)}
                invite={invite}
                key={invite.inviteId}
              />
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Invite row (inside pending dialog) ─── */

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
    <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
      <Avatar size="sm">
        <AvatarFallback>{invite.email[0]?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">
            {invite.email}
          </p>
          <Badge variant="outline">
            {businessMemberRoleMeta[invite.role].label}
          </Badge>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <CopyBusinessInviteLinkButton inviteUrl={invite.inviteUrl} />
        <form action={cancelFormAction}>
          <input name="businessSlug" type="hidden" value={businessSlug} />
          <Button disabled={isPending} size="sm" type="submit" variant="ghost">
            {isPending ? (
              <Spinner aria-hidden="true" />
            ) : (
              "Cancel"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
