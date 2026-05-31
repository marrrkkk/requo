"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { OptimisticPendingIndicator } from "@/components/shared/optimistic-pending-indicator";
import { Button } from "@/components/ui/button";
import {
  ResponsiveOverlay,
  ResponsiveOverlayClose,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
  ResponsiveOverlayTrigger,
} from "@/components/ui/responsive-overlay";
import { useDeferredActionState } from "@/hooks/use-deferred-action-state";
import type { FollowUpDeleteActionState } from "@/features/follow-ups/types";

type DeleteAction = (
  state: FollowUpDeleteActionState,
  formData: FormData,
) => Promise<FollowUpDeleteActionState>;

export function FollowUpDeleteDialog({
  action,
  followUpTitle,
  disabled = false,
  onOptimisticDismiss,
}: {
  action: DeleteAction;
  followUpTitle: string;
  disabled?: boolean;
  onOptimisticDismiss?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [, formAction, isPending] = useDeferredActionState(
    action,
    {} as FollowUpDeleteActionState,
    {
      onOptimistic: onOptimisticDismiss,
      onRevert: onOptimisticDismiss,
      onSuccess: () => setOpen(false),
    },
  );

  return (
    <ResponsiveOverlay open={open} onOpenChange={setOpen}>
      <ResponsiveOverlayTrigger asChild>
        <Button disabled={disabled} size="sm" type="button" variant="ghost">
          <Trash2 data-icon="inline-start" />
          Delete
        </Button>
      </ResponsiveOverlayTrigger>
      <ResponsiveOverlayContent className="sm:max-w-md">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>Delete this follow-up?</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>
            This removes &ldquo;{followUpTitle}&rdquo; from your active follow-up list.
          </ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        <form action={formAction}>
          <ResponsiveOverlayFooter>
            <ResponsiveOverlayClose asChild>
              <Button disabled={isPending} type="button" variant="ghost">
                Cancel
              </Button>
            </ResponsiveOverlayClose>
            <Button disabled={isPending} type="submit" variant="destructive">
              <OptimisticPendingIndicator pending={isPending} />
              Delete
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
