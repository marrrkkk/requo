"use client";

import { useState } from "react";
import { MailPlus, MoreHorizontal, Plus, Search, Users } from "lucide-react";

import { DashboardEmptyState } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  copyInviteLinkAction: (
    inviteId: string,
    businessSlug: string,
  ) => Promise<{ error?: string; inviteUrl?: string }>;
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
  copyInviteLinkAction,
  updateRoleAction,
  removeMemberAction,
  cancelInviteAction,
}: BusinessMembersManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = view.members.filter((member) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(lowerQuery) ||
      member.email.toLowerCase().includes(lowerQuery)
    );
  });

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Members"
        description="Manage who has access to this business and their roles."
        actions={
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {view.invites.length > 0 ? (
              <PendingInvitesDialog
                businessSlug={businessSlug}
                cancelInviteAction={cancelInviteAction}
                copyInviteLinkAction={copyInviteLinkAction}
                invites={view.invites}
              />
            ) : null}
            <InviteMemberDialog
              action={createInviteAction}
              businessSlug={businessSlug}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9"
            />
          </div>
        </div>

        {/* Members list */}
        {filteredMembers.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/50 shadow-sm">
            <div className="flex flex-col">
              {filteredMembers.map((member, i) => (
                <div
                  key={member.membershipId}
                  className={cn(
                    i > 0 && "border-t border-border/70",
                  )}
                >
                  <MemberRow
                    businessSlug={businessSlug}
                    member={member}
                    removeAction={removeMemberAction.bind(null, member.membershipId)}
                    updateRoleAction={updateRoleAction.bind(null, member.membershipId)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DashboardEmptyState
            description={
              searchQuery
                ? "No members match your search."
                : "Invite your first teammate to get started."
            }
            icon={Users}
            title={searchQuery ? "No members found" : "No members yet"}
            variant="section"
          />
        )}
      </div>
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
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const isEditable = member.role !== "owner" && !member.isCurrentUser;
  const editableRole = member.role === "owner" ? null : member.role;

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30">
        <div className="flex items-center gap-4 min-w-0">
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
        </div>

        {isEditable ? (
          <div className="flex shrink-0 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setShowRoleDialog(true)}>
                  Change role
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={() => setShowRemoveDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  Remove member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      {isEditable ? (
        <>
          <ChangeRoleDialog
            businessSlug={businessSlug}
            currentRole={editableRole!}
            memberName={member.name}
            updateRoleAction={updateRoleAction}
            open={showRoleDialog}
            onOpenChange={setShowRoleDialog}
          />
          <RemoveMemberDialog
            businessSlug={businessSlug}
            memberName={member.name}
            removeAction={removeAction}
            open={showRemoveDialog}
            onOpenChange={setShowRemoveDialog}
          />
        </>
      ) : null}
    </>
  );
}

/* ─── Change role dialog ─── */

function ChangeRoleDialog({
  businessSlug,
  currentRole,
  updateRoleAction,
  memberName,
  open,
  onOpenChange,
}: {
  businessSlug: string;
  currentRole: BusinessMemberAssignableRole;
  updateRoleAction: (
    state: BusinessMemberRoleActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRoleActionState>;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<BusinessMemberAssignableRole>(
    currentRole,
  );
  const [roleState, roleFormAction, isRolePending] = useActionStateWithSonner(
    updateRoleAction,
    initialRoleState,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Update the access level for {memberName}.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            roleFormAction(formData);
            onOpenChange(false);
          }}
        >
          <input name="businessSlug" type="hidden" value={businessSlug} />
          <input name="role" type="hidden" value={selectedRole} />
          <DialogBody>
            <Field>
              <FieldLabel htmlFor={`member-role-${currentRole}`}>Role</FieldLabel>
              <FieldContent>
                <Combobox
                  disabled={isRolePending}
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
              </FieldContent>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              disabled={isRolePending}
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button disabled={isRolePending} type="submit">
              {isRolePending ? (
                <>
                  <Spinner aria-hidden="true" data-icon="inline-start" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Remove member dialog ─── */

function RemoveMemberDialog({
  businessSlug,
  removeAction,
  memberName,
  open,
  onOpenChange,
}: {
  businessSlug: string;
  removeAction: (
    state: BusinessMemberRemoveActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRemoveActionState>;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, removeFormAction, isRemovePending] = useActionStateWithSonner(
    removeAction,
    initialDangerState,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {memberName}</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this member from the business? They will lose all access immediately.
          </DialogDescription>
        </DialogHeader>
        <form action={removeFormAction}>
          <input name="businessSlug" type="hidden" value={businessSlug} />
          <DialogFooter>
            <Button
              disabled={isRemovePending}
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button disabled={isRemovePending} variant="destructive" type="submit">
              {isRemovePending ? (
                <>
                  <Spinner aria-hidden="true" data-icon="inline-start" />
                  Removing...
                </>
              ) : (
                "Remove member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Pending invites dialog ─── */

function PendingInvitesDialog({
  businessSlug,
  invites,
  cancelInviteAction,
  copyInviteLinkAction,
}: {
  businessSlug: string;
  invites: BusinessMembersSettingsView["invites"];
  cancelInviteAction: BusinessMembersManagerProps["cancelInviteAction"];
  copyInviteLinkAction: BusinessMembersManagerProps["copyInviteLinkAction"];
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
                copyInviteLinkAction={copyInviteLinkAction}
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
  copyInviteLinkAction,
}: {
  businessSlug: string;
  invite: BusinessMembersSettingsView["invites"][number];
  cancelAction: (
    state: BusinessMemberRemoveActionState,
    formData: FormData,
  ) => Promise<BusinessMemberRemoveActionState>;
  copyInviteLinkAction: BusinessMembersManagerProps["copyInviteLinkAction"];
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
        <CopyBusinessInviteLinkButton
          businessSlug={businessSlug}
          copyInviteLinkAction={copyInviteLinkAction}
          inviteId={invite.inviteId}
        />
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
