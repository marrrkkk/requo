"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ResponsiveOverlay,
  ResponsiveOverlayClose,
  ResponsiveOverlayContent,
  ResponsiveOverlayFooter,
  ResponsiveOverlayTrigger,
} from "@/components/ui/responsive-overlay";
import { ConfirmationHeader } from "@/components/shared/confirmation-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
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
  optimistic?: {
    onOptimistic: () => void;
    onRevert: () => void;
  };
  redirectHref?: string;
  refreshOnSuccess?: boolean;
};

type ServerActionButtonProps<State extends ServerActionState> =
  SharedServerActionProps<State> & {
    label: string;
    pendingLabel: string;
    variant?: React.ComponentProps<typeof Button>["variant"];
    size?: React.ComponentProps<typeof Button>["size"];
    className?: string;
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
    formValues?: Record<string, string>;
  };

export function ServerActionButton<State extends ServerActionState>({
  action,
  disabled = false,
  icon: Icon,
  label,
  onSuccess,
  optimistic,
  pendingLabel,
  redirectHref,
  refreshOnSuccess = true,
  variant = "outline",
  size,
  className,
}: ServerActionButtonProps<State>) {
  const router = useProgressRouter();
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    {} as Awaited<State>,
  );

  useEffect(() => {
    if (state.error || state.fieldErrors) {
      optimistic?.onRevert();
    }
  }, [optimistic, state.error, state.fieldErrors]);

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
      scheduleRefresh();
    }
  }, [onSuccess, redirectHref, refreshOnSuccess, router, scheduleRefresh, state.success]);

  return (
    <form
      action={async (formData) => {
        optimistic?.onOptimistic();
        await formAction(formData);
      }}
    >
      <Button
        disabled={disabled || isPending}
        type="submit"
        variant={variant}
        size={size}
        className={className}
      >
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
  optimistic,
  redirectHref,
  refreshOnSuccess = true,
  title,
  triggerLabel,
  triggerVariant = "outline",
  formValues,
}: ServerActionConfirmDialogProps<State>) {
  const router = useProgressRouter();
  const { scheduleRefresh } = useDeferredRefresh();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    {} as Awaited<State>,
  );

  useEffect(() => {
    if (state.error || state.fieldErrors) {
      optimistic?.onRevert();
    }
  }, [optimistic, state.error, state.fieldErrors]);

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
      scheduleRefresh();
    }
  }, [onSuccess, redirectHref, refreshOnSuccess, router, scheduleRefresh, state.success]);

  return (
    <ResponsiveOverlay open={dialogOpen} onOpenChange={setDialogOpen}>
      <ResponsiveOverlayTrigger asChild>
        <Button disabled={disabled} type="button" variant={triggerVariant}>
          {Icon ? <Icon data-icon="inline-start" /> : null}
          {triggerLabel}
        </Button>
      </ResponsiveOverlayTrigger>
      <ResponsiveOverlayContent className="sm:max-w-lg">
        <ConfirmationHeader
          tone={confirmVariant === "destructive" ? "destructive" : "neutral"}
          icon={Icon}
          title={title}
          description={description}
        />
        <form
          action={async (formData) => {
            optimistic?.onOptimistic();
            await formAction(formData);
          }}
        >
          {redirectHref ? (
            <input name="redirectHref" type="hidden" value={redirectHref} />
          ) : null}
          {formValues
            ? Object.entries(formValues).map(([name, value]) => (
                <input key={name} name={name} type="hidden" value={value} />
              ))
            : null}
          <ResponsiveOverlayFooter>
            <ResponsiveOverlayClose asChild>
              <Button disabled={isPending} type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveOverlayClose>
            <Button disabled={isPending} type="submit" variant={confirmVariant}>
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  {confirmButtonLabel(confirmPendingLabel, confirmLabel)}
                </>
              ) : (
                <>
                  {Icon ? <Icon data-icon="inline-start" aria-hidden="true" /> : null}
                  {confirmLabel}
                </>
              )}
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}

function confirmButtonLabel(pendingLabel: string, fallback: string) {
  return pendingLabel.trim() ? pendingLabel : fallback;
}
