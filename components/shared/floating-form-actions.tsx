"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type FloatingFormActionsProps = {
  visible: boolean;
  state: "open" | "closed";
  isPending: boolean;
  disableSubmit?: boolean;
  message?: string;
  cancelLabel?: string;
  submitLabel?: string;
  submitPendingLabel?: string;
  onCancel: () => void;
  className?: string;
};

export function useFloatingUnsavedChanges(hasUnsavedChanges: boolean) {
  return {
    shouldRenderFloatingActions: hasUnsavedChanges,
    floatingActionsState: hasUnsavedChanges
      ? ("open" as const)
      : ("closed" as const),
  };
}

export function FloatingFormActions({
  visible,
  state,
  isPending,
  disableSubmit = false,
  message = "You have unsaved changes.",
  cancelLabel = "Cancel",
  submitLabel = "Save changes",
  submitPendingLabel = "Saving...",
  onCancel,
  className,
}: FloatingFormActionsProps) {
  if (!visible) {
    return null;
  }

  const isClosing = state === "closed";
  const disableCancelButton = isPending;
  const disableSubmitButton = isPending || (!isClosing && disableSubmit);

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        className={cn(
          "soft-panel motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-bottom-2 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=open]:duration-200 motion-safe:data-[state=open]:ease-(--motion-ease-emphasized) motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:slide-out-to-bottom-2 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=closed]:duration-150 motion-safe:data-[state=closed]:ease-(--motion-ease-standard) data-[state=closed]:pointer-events-none motion-reduce:animate-none flex w-full max-w-2xl items-center justify-between gap-3 border-border/80 bg-background/95 px-4 py-3 shadow-xl backdrop-blur",
          className,
        )}
        data-state={state}
      >
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex items-center gap-2">
          <Button
            disabled={disableCancelButton}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            {cancelLabel}
          </Button>
          <Button disabled={disableSubmitButton} size="lg" type="submit">
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                {submitPendingLabel}
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
