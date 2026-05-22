"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

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
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type { FollowUpDeleteActionState } from "@/features/follow-ups/types";

type DeleteAction = (
  state: FollowUpDeleteActionState,
  formData: FormData,
) => Promise<FollowUpDeleteActionState>;

export function FollowUpDeleteDialog({
  action,
  followUpTitle,
  disabled = false,
}: {
  action: DeleteAction;
  followUpTitle: string;
  disabled?: boolean;
}) {
  const router = useProgressRouter();
  const [open, setOpen] = useState(false);
  const [, formAction, isPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await action(prevState, formData);

      if (nextState.success) {
        setOpen(false);
        router.refresh();
      }

      return nextState;
    },
    {} as FollowUpDeleteActionState,
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
          <ResponsiveOverlayTitle>Delete follow-up</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>
            Are you sure you want to delete &ldquo;{followUpTitle}&rdquo;? This
            removes it from your list but keeps the activity log.
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
              {isPending ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
