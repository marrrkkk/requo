"use client";

import { useState } from "react";
import { Archive, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import type { OptimisticActionResult } from "@/hooks/use-optimistic-mutation";

type InquiryBulkActionsProps = {
  selectedCount: number;
  serializedIds: string;
  onComplete: () => void;
  onOptimisticRemove?: (
    ids: string[],
    mutation: () => Promise<OptimisticActionResult>,
  ) => void;
};

export function InquiryBulkActions({
  selectedCount,
  serializedIds,
  onComplete,
  onOptimisticRemove,
}: InquiryBulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const ids = serializedIds.split(",").filter(Boolean);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => {
          onOptimisticRemove?.(ids, async () => {
            const formData = new FormData();
            formData.set("inquiryIds", serializedIds);
            return bulkArchiveInquiriesAction({}, formData);
          });
          onComplete();
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        <Archive data-icon="inline-start" />
        Archive
      </Button>

      <InquiryBulkStatusDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        serializedIds={serializedIds}
        selectedCount={selectedCount}
        onSubmit={async (formData) => {
          onOptimisticRemove?.(ids, async () =>
            bulkChangeInquiryStatusAction({}, formData),
          );
          setShowStatusDialog(false);
          onComplete();
        }}
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
          <ResponsiveOverlayFooter>
            <ResponsiveOverlayClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </ResponsiveOverlayClose>
            <Button
              onClick={() => {
                onOptimisticRemove?.(ids, async () => {
                  const formData = new FormData();
                  formData.set("inquiryIds", serializedIds);
                  return bulkDeleteInquiriesAction({}, formData);
                });
                setShowDeleteDialog(false);
                onComplete();
              }}
              type="button"
              variant="destructive"
            >
              <Trash2 data-icon="inline-start" />
              Delete {selectedCount}
            </Button>
          </ResponsiveOverlayFooter>
        </ResponsiveOverlayContent>
      </ResponsiveOverlay>
    </>
  );
}
