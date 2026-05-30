"use client";

import { useState } from "react";
import { Archive, Trash2 } from "lucide-react";

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
  bulkArchiveInquiriesAction,
  bulkChangeInquiryStatusAction,
  bulkDeleteInquiriesAction,
} from "@/features/inquiries/actions";
import { InquiryBulkStatusDialog } from "@/features/inquiries/components/inquiry-bulk-status-dialog";
import type { InquiryBulkActionState } from "@/features/inquiries/types";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";

type InquiryBulkActionsProps = {
  selectedCount: number;
  serializedIds: string;
  onComplete: () => void;
};

export function InquiryBulkActions({
  selectedCount,
  serializedIds,
  onComplete,
}: InquiryBulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const router = useProgressRouter();

  const [, bulkArchiveAction, isArchivePending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await bulkArchiveInquiriesAction(prevState, formData);
      if (nextState.success) {
        onComplete();
        router.refresh();
      }
      return nextState;
    },
    {} as InquiryBulkActionState,
  );

  const [, bulkDeleteAction, isDeletePending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await bulkDeleteInquiriesAction(prevState, formData);
      if (nextState.success) {
        setShowDeleteDialog(false);
        onComplete();
        router.refresh();
      }
      return nextState;
    },
    {} as InquiryBulkActionState,
  );

  const [, bulkStatusAction, isStatusPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await bulkChangeInquiryStatusAction(prevState, formData);
      if (nextState.success) {
        setShowStatusDialog(false);
        onComplete();
        router.refresh();
      }
      return nextState;
    },
    {} as InquiryBulkActionState,
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
          <input name="inquiryIds" type="hidden" value={serializedIds} />
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

        <InquiryBulkStatusDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          serializedIds={serializedIds}
          selectedCount={selectedCount}
          formAction={bulkStatusAction}
          isPending={isStatusPending}
        />

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
                Delete {selectedCount} inquiry{selectedCount !== 1 ? "ies" : ""}?
              </ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>
                This permanently deletes the selected inquiries. Already-deleted
                inquiries will be skipped.
              </ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <form action={bulkDeleteAction}>
              <input name="inquiryIds" type="hidden" value={serializedIds} />
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
