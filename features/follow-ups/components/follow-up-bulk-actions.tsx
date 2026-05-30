"use client";

import { useState } from "react";
import { CheckCircle2, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveOverlay,
  ResponsiveOverlayClose,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
} from "@/components/ui/responsive-overlay";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  bulkCompleteFollowUpsAction,
  bulkSkipFollowUpsAction,
} from "@/features/follow-ups/actions";
import type { FollowUpBulkActionState, FollowUpView } from "@/features/follow-ups/types";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";

export function FollowUpBulkActions({
  followUps,
}: {
  followUps: FollowUpView[];
}) {
  const pendingFollowUps = followUps.filter((f) => f.status === "pending");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const router = useProgressRouter();

  const [, bulkCompleteAction, isCompletePending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await bulkCompleteFollowUpsAction(prevState, formData);
      if (nextState.success) {
        setShowCompleteDialog(false);
        setCompletionNote("");
        router.refresh();
      }
      return nextState;
    },
    {} as FollowUpBulkActionState,
  );

  const [, bulkSkipAction, isSkipPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await bulkSkipFollowUpsAction(prevState, formData);
      if (nextState.success) router.refresh();
      return nextState;
    },
    {} as FollowUpBulkActionState,
  );

  if (pendingFollowUps.length < 2) {
    return null;
  }

  const pendingIds = pendingFollowUps.map((f) => f.id).join(",");

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5">
      <span className="text-xs text-muted-foreground">
        {pendingFollowUps.length} pending
      </span>
      <div className="ml-auto flex items-center gap-2">
        <ResponsiveOverlay
          open={showCompleteDialog}
          onOpenChange={(open) => {
            if (open) setCompletionNote("");
            setShowCompleteDialog(open);
          }}
        >
          <Button
            onClick={() => setShowCompleteDialog(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <CheckCircle2 data-icon="inline-start" />
            Complete all
          </Button>
          <ResponsiveOverlayContent className="sm:max-w-md">
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>
                Complete {pendingFollowUps.length} follow-ups
              </ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>
                Mark all pending follow-ups on this page as done.
              </ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <form action={bulkCompleteAction}>
              <input name="followUpIds" type="hidden" value={pendingIds} />
              <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                <Field>
                  <FieldLabel htmlFor="bulk-completion-note">
                    What happened?
                  </FieldLabel>
                  <FieldDescription>
                    Optional note applied to all completed follow-ups.
                  </FieldDescription>
                  <FieldContent>
                    <Textarea
                      id="bulk-completion-note"
                      maxLength={500}
                      name="completionNote"
                      onChange={(event) => setCompletionNote(event.currentTarget.value)}
                      placeholder="Deal went cold, clearing pipeline..."
                      rows={2}
                      value={completionNote}
                    />
                  </FieldContent>
                </Field>
              </div>
              <ResponsiveOverlayFooter>
                <ResponsiveOverlayClose asChild>
                  <Button disabled={isCompletePending} type="button" variant="ghost">
                    Cancel
                  </Button>
                </ResponsiveOverlayClose>
                <Button disabled={isCompletePending} type="submit">
                  {isCompletePending ? (
                    <Spinner data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 data-icon="inline-start" />
                  )}
                  {isCompletePending
                    ? "Completing..."
                    : `Complete ${pendingFollowUps.length}`}
                </Button>
              </ResponsiveOverlayFooter>
            </form>
          </ResponsiveOverlayContent>
        </ResponsiveOverlay>

        <form action={bulkSkipAction}>
          <input name="followUpIds" type="hidden" value={pendingIds} />
          <Button
            disabled={isSkipPending}
            size="sm"
            type="submit"
            variant="ghost"
          >
            {isSkipPending ? (
              <Spinner data-icon="inline-start" aria-hidden="true" />
            ) : (
              <SkipForward data-icon="inline-start" />
            )}
            {isSkipPending ? "Skipping..." : "Skip all"}
          </Button>
        </form>
      </div>
    </div>
  );
}
