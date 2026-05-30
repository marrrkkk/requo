"use client";

import { useState } from "react";
import { Archive, Ban, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ResponsiveOverlay,
  ResponsiveOverlayClose,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
} from "@/components/ui/responsive-overlay";
import {
  bulkArchiveQuotesAction,
  bulkDeleteQuotesAction,
  bulkVoidQuotesAction,
} from "@/features/quotes/actions";
import type { QuoteBulkActionState } from "@/features/quotes/types";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";

type QuoteBulkActionsProps = {
  selectedCount: number;
  serializedIds: string;
  onComplete: () => void;
};

export function QuoteBulkActions({
  selectedCount,
  serializedIds,
  onComplete,
}: QuoteBulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useProgressRouter();

  const [, bulkArchiveAction, isArchivePending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await bulkArchiveQuotesAction(prevState, formData);
      if (nextState.success) {
        onComplete();
        router.refresh();
      }
      return nextState;
    },
    {} as QuoteBulkActionState,
  );

  const [, bulkVoidAction, isVoidPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await bulkVoidQuotesAction(prevState, formData);
      if (nextState.success) {
        onComplete();
        router.refresh();
      }
      return nextState;
    },
    {} as QuoteBulkActionState,
  );

  const [, bulkDeleteAction, isDeletePending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await bulkDeleteQuotesAction(prevState, formData);
      if (nextState.success) {
        setShowDeleteDialog(false);
        onComplete();
        router.refresh();
      }
      return nextState;
    },
    {} as QuoteBulkActionState,
  );

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5">
      <span className="text-xs text-muted-foreground">
        {selectedCount} selected
      </span>
      <div className="ml-auto flex items-center gap-2">
        <form action={bulkArchiveAction}>
          <input name="quoteIds" type="hidden" value={serializedIds} />
          <Button
            disabled={isArchivePending}
            size="sm"
            type="submit"
            variant="outline"
          >
            {isArchivePending ? (
              <Spinner data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Archive data-icon="inline-start" />
            )}
            {isArchivePending ? "Archiving..." : "Archive"}
          </Button>
        </form>

        <form action={bulkVoidAction}>
          <input name="quoteIds" type="hidden" value={serializedIds} />
          <Button
            disabled={isVoidPending}
            size="sm"
            type="submit"
            variant="outline"
          >
            {isVoidPending ? (
              <Spinner data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Ban data-icon="inline-start" />
            )}
            {isVoidPending ? "Voiding..." : "Void"}
          </Button>
        </form>

        <ResponsiveOverlay
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
        >
          <Button
            onClick={() => setShowDeleteDialog(true)}
            size="sm"
            type="button"
            variant="destructive"
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
          <ResponsiveOverlayContent className="sm:max-w-md">
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>
                Delete {selectedCount} quote{selectedCount !== 1 ? "s" : ""}
              </ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>
                Only draft, non-archived quotes will be permanently deleted.
                Other quotes will be skipped.
              </ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <form action={bulkDeleteAction}>
              <input name="quoteIds" type="hidden" value={serializedIds} />
              <input name="confirmed" type="hidden" value="true" />
              <ResponsiveOverlayFooter>
                <ResponsiveOverlayClose asChild>
                  <Button disabled={isDeletePending} type="button" variant="ghost">
                    Cancel
                  </Button>
                </ResponsiveOverlayClose>
                <Button disabled={isDeletePending} type="submit" variant="destructive">
                  {isDeletePending ? (
                    <Spinner data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <Trash2 data-icon="inline-start" />
                  )}
                  {isDeletePending
                    ? "Deleting..."
                    : `Delete ${selectedCount}`}
                </Button>
              </ResponsiveOverlayFooter>
            </form>
          </ResponsiveOverlayContent>
        </ResponsiveOverlay>
      </div>
    </div>
  );
}
