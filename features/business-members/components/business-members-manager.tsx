"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  MailPlus,
  MoreHorizontal,
  Trash2,
  UserCog,
  UserMinus,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LockedAction } from "@/features/paywall";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import type {
  BusinessMemberInviteActionState,
  BusinessMemberAction,
} from "@/features/business-members/action-types";
import type {
  BusinessMemberInviteView,
  BusinessMemberView,
  BusinessMembersSettingsView,
} from "@/features/business-members/types";
import { getBusinessMemberInvitePath } from "@/features/businesses/routes";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  businessMemberRoleMeta,
  type BusinessMemberRole,
} from "@/lib/business-members";
import type { BusinessPlan } from "@/lib/plans/plans";

type MembersManagerProps = {
  view: BusinessMembersSettingsView;
  plan: BusinessPlan;
  createInviteAction: BusinessMemberAction;
  cancelInviteAction: BusinessMemberAction;
  updateRoleAction: BusinessMemberAction;
  removeMemberAction: BusinessMemberAction;
};

type AssignableRole = BusinessMemberRole;

const initialState: BusinessMemberInviteActionState = {};
const assignableRoles: readonly AssignableRole[] = ["owner", "manager", "staff"];

const roleOptions: ComboboxOption[] = assignableRoles.map((value) => ({
  label: businessMemberRoleMeta[value].label,
  searchText: `${businessMemberRoleMeta[value].label} ${businessMemberRoleMeta[value].description}`,
  value,
}));

export function BusinessMembersManager({
  view,
  plan,
  createInviteAction,
  cancelInviteAction,
  updateRoleAction,
  removeMemberAction,
}: MembersManagerProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("staff");
  const [accessMember, setAccessMember] = useState<BusinessMemberView | null>(
    null,
  );
  const [accessRole, setAccessRole] = useState<AssignableRole>("staff");
  const [removeMember, setRemoveMember] = useState<BusinessMemberView | null>(
    null,
  );

  const [inviteState, inviteFormAction, isInvitePending] =
    useActionStateWithSonner(createInviteAction, initialState);
  const [, cancelInviteFormAction, isCancelInvitePending] =
    useActionStateWithSonner(cancelInviteAction, initialState);
  const [, updateRoleFormAction, isRoleUpdatePending] =
    useActionStateWithSonner(updateRoleAction, initialState);
  const [, removeMemberFormAction, isRemoveMemberPending] =
    useActionStateWithSonner(removeMemberAction, initialState);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const inviteLink = useMemo(() => {
    const link = inviteState?.inviteLink;
    if (typeof link !== "string" || !link) {
      return null;
    }

    return link.startsWith("/") ? `${origin}${link}` : link;
  }, [inviteState?.inviteLink, origin]);

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
  }

  function openAccessDialog(member: BusinessMemberView) {
    setAccessRole(member.role);
    setAccessMember(member);
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardSection
        title="Members"
        description="Review business access, invite teammates, and keep admin permissions limited to the right people."
        action={
          <LockedAction feature="members" plan={plan}>
            <Button type="button" onClick={() => setInviteOpen(true)}>
              <MailPlus data-icon="inline-start" />
              Invite member
            </Button>
          </LockedAction>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {view.members.length} member{view.members.length === 1 ? "" : "s"}
            </Badge>
            {view.invites.length ? (
              <Badge variant="outline">
                {view.invites.length} pending invite
                {view.invites.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background/60">
            <div className="flex flex-col">
              {view.members.map((member, index) => (
                <MemberRow
                  key={member.membershipId}
                  member={member}
                  onManageAccess={openAccessDialog}
                  onRemove={setRemoveMember}
                  ownerCount={view.members.filter((m) => m.role === "owner").length}
                  rowIndex={index}
                />
              ))}
            </div>
          </div>
        </div>
      </DashboardSection>

      {inviteLink ? (
        <DashboardSection
          title="Latest invite link"
          description="Send this link to the invited email address. The link also appears in pending invites until it is accepted or canceled."
        >
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 truncate font-mono text-xs text-muted-foreground">
              {inviteLink}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await copyText(inviteLink);
              }}
            >
              <Copy data-icon="inline-start" />
              Copy link
            </Button>
          </div>
        </DashboardSection>
      ) : null}

      {view.invites.length ? (
        <PendingInvitesSection
          invites={view.invites}
          inviteOrigin={origin}
          isCancelPending={isCancelInvitePending}
          onCancelInvite={cancelInviteFormAction}
          onCopyInvite={copyText}
        />
      ) : null}

      <InviteMemberDialog
        email={email}
        isPending={isInvitePending}
        onEmailChange={setEmail}
        onOpenChange={setInviteOpen}
        onRoleChange={setRole}
        onSubmit={inviteFormAction}
        open={inviteOpen}
        role={role}
      />

      <ManageAccessDialog
        member={accessMember}
        onMemberChange={setAccessMember}
        onRoleChange={setAccessRole}
        onSubmit={updateRoleFormAction}
        role={accessRole}
        submitting={isRoleUpdatePending}
      />

      <RemoveMemberDialog
        member={removeMember}
        onMemberChange={setRemoveMember}
        onSubmit={removeMemberFormAction}
        submitting={isRemoveMemberPending}
      />
    </div>
  );
}

function InviteMemberDialog({
  email,
  isPending,
  onEmailChange,
  onOpenChange,
  onRoleChange,
  onSubmit,
  open,
  role,
}: {
  email: string;
  isPending: boolean;
  onEmailChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onRoleChange: (role: AssignableRole) => void;
  onSubmit: ReturnType<typeof useActionStateWithSonner<BusinessMemberInviteActionState>>[1];
  open: boolean;
  role: AssignableRole;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form
          action={async (formData) => {
            formData.set("email", email);
            formData.set("role", role);
            await onSubmit(formData);
            onOpenChange(false);
            onEmailChange("");
            onRoleChange("staff");
          }}
        >
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              Create a secure invite link for someone who helps manage inquiries,
              quotes, and follow-ups for this business.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="member-invite-email">
                  Email address
                </FieldLabel>
                <Input
                  autoComplete="email"
                  disabled={isPending}
                  id="member-invite-email"
                  name="email"
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="teammate@company.com"
                  type="email"
                  value={email}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="member-invite-role">Role</FieldLabel>
                <Combobox
                  disabled={isPending}
                  id="member-invite-role"
                  onValueChange={(value) => {
                    onRoleChange(value as AssignableRole);
                  }}
                  options={roleOptions}
                  placeholder="Choose a role"
                  renderOption={(option) => {
                    const optionRole = option.value as AssignableRole;

                    return (
                      <div className="flex flex-col gap-1">
                        <span className="truncate">
                          {businessMemberRoleMeta[optionRole].label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {businessMemberRoleMeta[optionRole].description}
                        </span>
                      </div>
                    );
                  }}
                  searchable={false}
                  value={role}
                />
                <FieldDescription>
                  Owners can change this later from the member list.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isPending} type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={isPending} type="submit">
              <MailPlus data-icon="inline-start" />
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PendingInvitesSection({
  invites,
  inviteOrigin,
  isCancelPending,
  onCancelInvite,
  onCopyInvite,
}: {
  invites: BusinessMemberInviteView[];
  inviteOrigin: string;
  isCancelPending: boolean;
  onCancelInvite: ReturnType<typeof useActionStateWithSonner<BusinessMemberInviteActionState>>[1];
  onCopyInvite: (value: string) => Promise<void>;
}) {
  return (
    <DashboardSection
      title="Pending invites"
      description="Copy an invite link or cancel access before the invite is accepted."
      action={<Badge variant="secondary">{invites.length}</Badge>}
    >
      <div className="grid gap-3">
        {invites.map((invite) => {
          const inviteUrl = `${inviteOrigin}${getBusinessMemberInvitePath(invite.token)}`;
          const roleLabel = businessMemberRoleMeta[invite.role].label;

          return (
            <div
              className="rounded-xl border border-border bg-background/60 p-4"
              key={invite.inviteId}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {invite.email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {roleLabel} invite, expires{" "}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => onCopyInvite(inviteUrl)}
                  >
                    <Copy data-icon="inline-start" />
                    Copy link
                  </Button>

                  <form action={onCancelInvite}>
                    <input
                      type="hidden"
                      name="inviteId"
                      value={invite.inviteId}
                    />
                    <Button
                      disabled={isCancelPending}
                      type="submit"
                      variant="outline"
                    >
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
    </DashboardSection>
  );
}

function MemberRow({
  member,
  onManageAccess,
  onRemove,
  ownerCount,
  rowIndex,
}: {
  member: BusinessMemberView;
  onManageAccess: (member: BusinessMemberView) => void;
  onRemove: (member: BusinessMemberView) => void;
  ownerCount: number;
  rowIndex: number;
}) {
  const roleMeta = businessMemberRoleMeta[member.role];
  const isOwner = member.role === "owner";
  const isLastOwner = isOwner && ownerCount <= 1;
  const canLeave = member.isCurrentUser && !isLastOwner;
  const canRemove = !member.isCurrentUser;

  return (
    <div className={rowIndex > 0 ? "border-t border-border" : undefined}>
      <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-10">
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
              {member.isCurrentUser ? <Badge variant="outline">You</Badge> : null}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {member.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:justify-end">
          {!member.isCurrentUser ? (
            <Button
              className="hidden md:inline-flex"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onManageAccess(member)}
            >
              <UserCog data-icon="inline-start" />
              Manage access
            </Button>
          ) : null}

          <MemberActionsMenu
            canLeave={canLeave}
            canRemove={canRemove}
            isCurrentUser={member.isCurrentUser}
            member={member}
            onManageAccess={onManageAccess}
            onRemove={onRemove}
          />
        </div>
      </div>
    </div>
  );
}

function MemberActionsMenu({
  canLeave,
  canRemove,
  isCurrentUser,
  member,
  onManageAccess,
  onRemove,
}: {
  canLeave: boolean;
  canRemove: boolean;
  isCurrentUser: boolean;
  member: BusinessMemberView;
  onManageAccess: (member: BusinessMemberView) => void;
  onRemove: (member: BusinessMemberView) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const actionLabel = isCurrentUser ? "Leave business" : "Remove member";
  const disabled = isCurrentUser ? !canLeave : !canRemove;

  function handleAction() {
    setOpen(false);
    onRemove(member);
  }

  function handleManageAccess() {
    setOpen(false);
    onManageAccess(member);
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            aria-label={`Open actions for ${member.name}`}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal />
            <span className="sr-only">Open actions for {member.name}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{member.name}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <div className="flex flex-col gap-1">
              {!isCurrentUser ? (
                <Button
                  className="w-full justify-start"
                  type="button"
                  variant="ghost"
                  onClick={handleManageAccess}
                >
                  <UserCog data-icon="inline-start" />
                  Manage access
                </Button>
              ) : null}
              <Button
                className="w-full justify-start text-destructive"
                disabled={disabled}
                type="button"
                variant="ghost"
                onClick={handleAction}
              >
                <UserMinus data-icon="inline-start" />
                {actionLabel}
              </Button>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${member.name}`}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal />
          <span className="sr-only">Open actions for {member.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={disabled}
            variant="destructive"
            onSelect={handleAction}
          >
            <UserMinus />
            {actionLabel}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ManageAccessDialog({
  member,
  onMemberChange,
  onRoleChange,
  onSubmit,
  role,
  submitting,
}: {
  member: BusinessMemberView | null;
  onMemberChange: (member: BusinessMemberView | null) => void;
  onRoleChange: (role: AssignableRole) => void;
  onSubmit: ReturnType<typeof useActionStateWithSonner<BusinessMemberInviteActionState>>[1];
  role: AssignableRole;
  submitting: boolean;
}) {
  return (
    <Dialog
      open={Boolean(member)}
      onOpenChange={(open) => {
        if (!open) {
          onMemberChange(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        {member ? (
          <form
            action={async (formData) => {
              formData.set("membershipId", member.membershipId);
              formData.set("userId", member.userId);
              formData.set("role", role);
              await onSubmit(formData);
              onMemberChange(null);
            }}
          >
            <DialogHeader>
              <DialogTitle>Manage access</DialogTitle>
              <DialogDescription>
                Choose what {member.name} can do in this business.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <FieldSet>
                <FieldLegend>Role</FieldLegend>
                <RadioGroup
                  name="role"
                  value={role}
                  onValueChange={(value) => {
                    onRoleChange(value as AssignableRole);
                  }}
                >
                  {assignableRoles.map((roleValue) => {
                    const id = `member-role-${member.membershipId}-${roleValue}`;
                    const meta = businessMemberRoleMeta[roleValue];

                    return (
                      <Field
                        className="rounded-xl border border-border bg-background/60 p-3"
                        key={roleValue}
                        orientation="horizontal"
                      >
                        <RadioGroupItem
                          disabled={submitting}
                          id={id}
                          value={roleValue}
                        />
                        <FieldContent>
                          <FieldLabel htmlFor={id}>{meta.label}</FieldLabel>
                          <FieldDescription>{meta.description}</FieldDescription>
                        </FieldContent>
                      </Field>
                    );
                  })}
                </RadioGroup>
              </FieldSet>
            </DialogBody>

            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={submitting} type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={submitting} type="submit">
                Save changes
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RemoveMemberDialog({
  member,
  onMemberChange,
  onSubmit,
  submitting,
}: {
  member: BusinessMemberView | null;
  onMemberChange: (member: BusinessMemberView | null) => void;
  onSubmit: ReturnType<typeof useActionStateWithSonner<BusinessMemberInviteActionState>>[1];
  submitting: boolean;
}) {
  const isSelf = member?.isCurrentUser ?? false;

  return (
    <AlertDialog
      open={Boolean(member)}
      onOpenChange={(open) => {
        if (!open) {
          onMemberChange(null);
        }
      }}
    >
      <AlertDialogContent>
        {member ? (
          <form
            action={async (formData) => {
              formData.set("membershipId", member.membershipId);
              formData.set("userId", member.userId);
              await onSubmit(formData);
              onMemberChange(null);
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isSelf ? "Leave this business?" : "Remove member?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isSelf
                  ? "You will lose access to this business, including inquiries, quotes, follow-ups, and settings."
                  : `${member.name} will lose access to this business, including inquiries, quotes, follow-ups, and settings.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogBody>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Current role: {businessMemberRoleMeta[member.role].label}
                </p>
              </div>
            </AlertDialogBody>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button disabled={submitting} type="button" variant="outline">
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button disabled={submitting} type="submit" variant="destructive">
                  {isSelf ? "Leave business" : "Remove member"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
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
          className="rounded-xl border border-border bg-background/50 p-6"
          key={index}
        >
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="mt-2 h-4 w-64 rounded-md" />
          <Skeleton className="mt-5 h-10 w-full rounded-lg sm:w-48" />
        </div>
      ))}
    </div>
  );
}
