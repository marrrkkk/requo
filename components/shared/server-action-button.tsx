"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";

type ServerActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type ServerAction<State extends ServerActionState> = (
  state: Awaited<State>,
  formData: FormData,
) => Promise<State>;

type SharedServerActionProps<State extends ServerActionState> = {
  action: ServerAction<State>;
  disabled?: boolean;
  icon?: LucideIcon;
  onSuccess?: () => void;
  redirectHref?: string;
  refreshOnSuccess?: boolean;
};

type ServerActionButtonProps<State extends ServerActionState> =
  SharedServerActionProps<State> & {
    label: string;
    pendingLabel: string;
    variant?: React.ComponentProps<typeof Button>["variant"];
  };

type ServerActionConfirmDialogProps<State extends ServerActionState> =
  SharedServerActionProps<State> & {
    confirmLabel: string;
    confirmPendingLabel: string;
    confirmVariant?: React.ComponentProps<typeof Button>["variant"];
    description: ReactNode;
    title: string;
    triggerLabel: string;
    triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  };

export function ServerActionButton<State extends ServerActionState>({
  action,
  disabled = false,
  icon: Icon,
  label,
  onSuccess,
  pendingLabel,
  redirectHref,
  refreshOnSuccess = true,
  variant = "outline",
}: ServerActionButtonProps<State>) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    {} as Awaited<State>,
  );

  // Fire side-effects on success. The action's isPending has already
  // reset by the time this runs, so the button shows its idle label
  // while the background refresh streams in fresh data.
  useEffect(() => {
    if (!state.success) {
      return;
    }

    onSuccess?.();

    if (redirectHref) {
      router.replace(redirectHref);
      return;
    }

    if (refreshOnSuccess) {
      router.refresh();
    }
  }, [onSuccess, redirectHref, refreshOnSuccess, router, state.success]);

  return (
    <form action={formAction}>
      <Button disabled={disabled || isPending} type="submit" variant={variant}>
        {isPending ? (
          <>
            <Spinner data-icon="inline-start" aria-hidden="true" />
            {confirmButtonLabel(pendingLabel, label)}
          </>
        ) : (
          <>
            {Icon ? <Icon data-icon="inline-start" /> : null}
            {label}
          </>
        )}
      </Button>
    </form>
  );
}

export function ServerActionConfirmDialog<State extends ServerActionState>({
  action,
  confirmLabel,
  confirmPendingLabel,
  confirmVariant = "destructive",
  description,
  disabled = false,
  icon: Icon,
  onSuccess,
  redirectHref,
  refreshOnSuccess = true,
  title,
  triggerLabel,
  triggerVariant = "outline",
}: ServerActionConfirmDialogProps<State>) {
  const router = useProgressRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    {} as Awaited<State>,
  );

  // Close dialog and fire side-effects on success.
  // Schedule dialog close outside the synchronous effect to avoid
  // cascading render warnings.
  useEffect(() => {
    if (!state.success) {
      return;
    }

    queueMicrotask(() => setDialogOpen(false));
    onSuccess?.();

    if (redirectHref) {
      router.replace(redirectHref);
      return;
    }

    if (refreshOnSuccess) {
      router.refresh();
    }
  }, [onSuccess, redirectHref, refreshOnSuccess, router, state.success]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} type="button" variant={triggerVariant}>
          {Icon ? <Icon data-icon="inline-start" /> : null}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isPending} type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <form action={formAction}>
            <Button disabled={isPending} type="submit" variant={confirmVariant}>
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  {confirmButtonLabel(confirmPendingLabel, confirmLabel)}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function confirmButtonLabel(pendingLabel: string, fallback: string) {
  return pendingLabel.trim() ? pendingLabel : fallback;
}
