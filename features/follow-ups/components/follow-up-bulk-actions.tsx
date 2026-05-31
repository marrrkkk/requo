"use client";

import { useState } from "react";
import { CheckCircle2, SkipForward } from "lucide-react";

import { OptimisticPendingIndicator } from "@/components/shared/optimistic-pending-indicator";
import { Button } from "@/components/ui/button";
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
import type { FollowUpView } from "@/features/follow-ups/types";
import type { OptimisticActionResult } from "@/hooks/use-optimistic-mutation";

type FollowUpBulkActionsProps = {
  followUps: FollowUpView[];
  onOptimisticRemove?: (
    ids: string[],
    mutation: () => Promise<OptimisticActionResult>,
  ) => void;
};

export function FollowUpBulkActions({
  followUps,
  onOptimisticRemove,
}: FollowUpBulkActionsProps) {
  const pendingFollowUps = followUps.filter((f) => f.status === "pending");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [isCompletePending, setIsCompletePending] = useState(false);
  const [isSkipPending, setIsSkipPending] = useState(false);

  if (pendingFollowUps.length < 2) {
    return null;
  }

  const pendingIds = pendingFollowUps.map((f) => f.id);
  const serializedIds = pendingIds.join(",");

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
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setIsCompletePending(true);

                const formData = new FormData(event.currentTarget);
                onOptimisticRemove?.(pendingIds, async () => {
                  try {
                    return bulkCompleteFollowUpsAction({}, formData);
                  } finally {
                    setIsCompletePending(false);
                  }
                });

                setShowCompleteDialog(false);
                setCompletionNote("");
              }}
            >
              <input name="followUpIds" type="hidden" value={serializedIds} />
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
                  <OptimisticPendingIndicator pending={isCompletePending} />
                  <CheckCircle2 data-icon="inline-start" />
                  Complete {pendingFollowUps.length}
                </Button>
              </ResponsiveOverlayFooter>
            </form>
          </ResponsiveOverlayContent>
        </ResponsiveOverlay>

        <Button
          disabled={isSkipPending}
          onClick={() => {
            setIsSkipPending(true);
            onOptimisticRemove?.(pendingIds, async () => {
              try {
                const formData = new FormData();
                formData.set("followUpIds", serializedIds);
                return bulkSkipFollowUpsAction({}, formData);
              } finally {
                setIsSkipPending(false);
              }
            });
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          <OptimisticPendingIndicator pending={isSkipPending} />
          <SkipForward data-icon="inline-start" />
          Skip all
        </Button>
      </div>
    </div>
  );
}
