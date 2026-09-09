"use client";

import {
  CheckCircle2,
  LogOut,
  OctagonMinus,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserCog,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmPasswordDialog } from "@/features/admin/components/confirm-password-dialog";
import {
  deleteUserAction,
  demoteFromAdminAction,
  forceVerifyEmailAction,
  promoteToAdminAction,
  revokeAllSessionsAction,
  suspendUserAction,
  unsuspendUserAction,
} from "@/features/admin/mutations";
import {
  ADMIN_USERS_PATH,
  getAdminStartImpersonationPath,
} from "@/features/admin/navigation";
import type { AdminActionResult } from "@/features/admin/types";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import { useProgressRouter } from "@/hooks/use-progress-router";

type AdminUserActionsProps = {
  /** Target user id (the user whose detail page this is). */
  targetUserId: string;
  /** Target user email, used in success toasts. */
  targetEmail: string;
  /** Whether the target user is currently suspended. */
  targetIsSuspended: boolean;
  /** Whether the target user's email is already verified. */
  targetEmailVerified: boolean;
  /** Whether the target user already has admin role. */
  targetIsAdmin: boolean;
  /**
   * Whether demoting the target is allowed (false when the target is
   * the last remaining admin). Passed from the server after a count
   * check so the button can be disabled preemptively.
   */
  canDemoteTarget: boolean;
  /** Admin user id — the acting admin's id from the session. */
  adminUserId: string;
};

/**
 * Which action the admin picked while the confirm-password dialog is
 * open. Stored alongside the opener so we know which server action to
 * call once the token is issued.
 */
type QueuedActionId =
  | "verify"
  | "revoke"
  | "suspend"
  | "unsuspend"
  | "delete"
  | "impersonate"
  | "promote"
  | "demote";

type QueuedAction = {
  id: QueuedActionId;
  label: string;
  description?: string;
  confirmLabel: string;
};

/**
 * Action cluster rendered on `/admin/users/[userId]` (task 12.2).
 *
 * Every button flows through `ConfirmPasswordDialog` to obtain a fresh
 * password re-confirmation token, then calls the matching server
 * action with the target user id + token. Self-target buttons are
 * disabled with a tooltip explaining why instead of being hidden
 * (Req 4.6, 8.5 — visible but inoperative keeps the surface
 * discoverable).
 *
 * Impersonation uses a form POST to
 * `/admin/users/[userId]/impersonate` so the redirect to
 * `/businesses` happens on the server (Req 8.1). The other actions
 * call server actions directly, toast the result, and `router.refresh()`
 * on success so the detail page shows the new state (Verified /
 * Suspended badges, active session count, audit entries).
 */
export function AdminUserActions({
  targetUserId,
  targetEmail,
  targetIsSuspended,
  targetEmailVerified,
  targetIsAdmin,
  canDemoteTarget,
  adminUserId,
}: AdminUserActionsProps) {
  const router = useProgressRouter();
  const { scheduleRefresh } = useDeferredRefresh();
  const [isPending, startTransition] = useTransition();
  const [queuedAction, setQueuedAction] = useState<QueuedAction | null>(null);
  const impersonateFormRef = useRef<HTMLFormElement | null>(null);
  const impersonateTokenInputRef = useRef<HTMLInputElement | null>(null);

  const isSelf = targetUserId === adminUserId;

  const openConfirm = useCallback((action: QueuedAction) => {
    setQueuedAction(action);
  }, []);

  const handleResult = useCallback(
    (result: AdminActionResult, fallbackSuccess: string) => {
      if (result.ok) {
        toast.success(result.message ?? fallbackSuccess);
        scheduleRefresh();
      } else {
        toast.error(result.error);
      }
    },
    [scheduleRefresh],
  );

  const handleConfirmed = useCallback(
    (token: string) => {
      const queued = queuedAction;
      if (!queued) {
        return;
      }

      setQueuedAction(null);

      if (queued.id === "impersonate") {
        // Route impersonation through the existing POST handler so
        // the session swap + redirect happens server-side.
        if (impersonateTokenInputRef.current && impersonateFormRef.current) {
          impersonateTokenInputRef.current.value = token;
          impersonateFormRef.current.requestSubmit();
        }
        return;
      }

      startTransition(async () => {
        switch (queued.id) {
          case "verify": {
            const result = await forceVerifyEmailAction({
              targetUserId,
              confirmToken: token,
            });
            handleResult(result, `Email verified for ${targetEmail}.`);
            return;
          }
          case "revoke": {
            const result = await revokeAllSessionsAction({
              targetUserId,
              confirmToken: token,
            });
            handleResult(result, `Sessions revoked for ${targetEmail}.`);
            return;
          }
          case "suspend": {
            const result = await suspendUserAction({
              targetUserId,
              confirmToken: token,
            });
            handleResult(result, `Suspended ${targetEmail}.`);
            return;
          }
          case "unsuspend": {
            const result = await unsuspendUserAction({
              targetUserId,
              confirmToken: token,
            });
            handleResult(result, `Reinstated ${targetEmail}.`);
            return;
          }
          case "delete": {
            const result = await deleteUserAction({
              targetUserId,
              confirmToken: token,
            });
            handleResult(result, `Deleted ${targetEmail}.`);
            if (result.ok) {
              router.replace(ADMIN_USERS_PATH);
            }
            return;
          }
          case "promote": {
            const result = await promoteToAdminAction({
              targetUserId,
              confirmToken: token,
            });
            handleResult(result, `Promoted ${targetEmail} to admin.`);
            return;
          }
          case "demote": {
            const result = await demoteFromAdminAction({
              targetUserId,
              confirmToken: token,
            });
            handleResult(result, `Removed admin access from ${targetEmail}.`);
            return;
          }
        }
      });
    },
    [handleResult, queuedAction, router, targetEmail, targetUserId],
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton
          disabled={isPending || targetEmailVerified}
          disabledReason={
            targetEmailVerified ? "Email is already verified." : undefined
          }
          icon={CheckCircle2}
          isPending={isPending}
          label="Verify email"
          onClick={() =>
            openConfirm({
              id: "verify",
              label: "Verify email",
              description: `Mark ${targetEmail} as verified.`,
              confirmLabel: "Verify email",
            })
          }
          selfBlocked={isSelf}
          variant="outline"
        />

        <ActionButton
          disabled={isPending}
          icon={LogOut}
          isPending={isPending}
          label="Revoke sessions"
          onClick={() =>
            openConfirm({
              id: "revoke",
              label: "Revoke all sessions",
              description: `Sign ${targetEmail} out of every active session.`,
              confirmLabel: "Revoke sessions",
            })
          }
          selfBlocked={isSelf}
          variant="outline"
        />

        {targetIsSuspended ? (
          <ActionButton
            disabled={isPending}
            icon={UserRoundCheck}
            isPending={isPending}
            label="Reinstate"
            onClick={() =>
              openConfirm({
                id: "unsuspend",
                label: "Reinstate user",
                description: `Restore sign-in for ${targetEmail}.`,
                confirmLabel: "Reinstate",
              })
            }
            selfBlocked={false}
            variant="outline"
          />
        ) : (
          <ActionButton
            disabled={isPending}
            icon={OctagonMinus}
            isPending={isPending}
            label="Suspend"
            onClick={() =>
              openConfirm({
                id: "suspend",
                label: "Suspend user",
                description: `Block ${targetEmail} from signing in.`,
                confirmLabel: "Suspend",
              })
            }
            selfBlocked={isSelf}
            variant="outline"
          />
        )}

        {targetIsAdmin ? (
          <ActionButton
            disabled={isPending || !canDemoteTarget}
            disabledReason={
              canDemoteTarget ? undefined : "This is the last remaining admin."
            }
            icon={ShieldX}
            isPending={isPending}
            label="Remove admin"
            onClick={() =>
              openConfirm({
                id: "demote",
                label: "Remove admin access",
                description: `Revoke admin console access for ${targetEmail}. They keep their normal Requo account.`,
                confirmLabel: "Remove admin",
              })
            }
            selfBlocked={isSelf}
            variant="outline"
          />
        ) : (
          <ActionButton
            disabled={isPending}
            icon={ShieldCheck}
            isPending={isPending}
            label="Promote to admin"
            onClick={() =>
              openConfirm({
                id: "promote",
                label: "Promote to admin",
                description: `Grant ${targetEmail} access to the admin console.`,
                confirmLabel: "Promote to admin",
              })
            }
            selfBlocked={false}
            variant="outline"
          />
        )}

        <ActionButton
          disabled={isPending}
          icon={UserCog}
          isPending={isPending}
          label="Impersonate"
          onClick={() =>
            openConfirm({
              id: "impersonate",
              label: "Start impersonation",
              description: `Sign in as ${targetEmail}. The impersonation banner stays visible until you stop.`,
              confirmLabel: "Start impersonation",
            })
          }
          selfBlocked={isSelf}
          variant="outline"
        />

        <ActionButton
          disabled={isPending}
          icon={Trash2}
          isPending={isPending}
          label="Delete"
          onClick={() =>
            openConfirm({
              id: "delete",
              label: "Delete user",
              description: `Permanently delete ${targetEmail}. Data cascades per the existing schema.`,
              confirmLabel: "Delete user",
            })
          }
          selfBlocked={isSelf}
          variant="destructive"
        />
      </div>

      {/* Hidden form used by the impersonation action so the redirect
          happens server-side. The dialog populates the token input
          before submitting. */}
      <form
        action={getAdminStartImpersonationPath(targetUserId)}
        className="hidden"
        method="POST"
        ref={impersonateFormRef}
      >
        <input
          name="confirmToken"
          ref={impersonateTokenInputRef}
          type="hidden"
        />
      </form>

      <ConfirmPasswordDialog
        actionLabel={queuedAction?.label ?? ""}
        confirmLabel={queuedAction?.confirmLabel}
        description={queuedAction?.description}
        onConfirmed={handleConfirmed}
        onOpenChange={(open) => {
          if (!open) {
            setQueuedAction(null);
          }
        }}
        open={queuedAction !== null}
      />
    </TooltipProvider>
  );
}

type ActionButtonProps = {
  disabled: boolean;
  disabledReason?: string;
  icon: LucideIcon;
  isPending?: boolean;
  label: string;
  onClick: () => void;
  selfBlocked: boolean;
  variant: React.ComponentProps<typeof Button>["variant"];
};

/**
 * Action button that handles the self-target lockout with an
 * accessible tooltip. Self-blocked buttons render disabled but
 * discoverable (Req 4.6 / design doc — "don't hide self-actions,
 * disable with explanation").
 */
function ActionButton({
  disabled,
  disabledReason,
  icon: Icon,
  isPending = false,
  label,
  onClick,
  selfBlocked,
  variant,
}: ActionButtonProps) {
  const selfReason = "You can't run this action on your own account.";
  const reason = selfBlocked ? selfReason : disabledReason;
  const isDisabled = disabled || selfBlocked;
  const showSpinner = isPending && !selfBlocked && !disabledReason;

  const button = (
    <Button
      disabled={isDisabled}
      onClick={onClick}
      type="button"
      variant={variant}
    >
      {showSpinner ? (
        <Spinner data-icon="inline-start" aria-hidden="true" />
      ) : (
        <Icon data-icon="inline-start" />
      )}
      {label}
    </Button>
  );

  if (!reason) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Wrap in a span so the tooltip still fires while the button
            is disabled — disabled buttons don't emit pointer events. */}
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
