"use client";

import { useState } from "react";
import { Archive, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  bulkArchiveQuotesAction,
  bulkDeleteQuotesAction,
  bulkVoidQuotesAction,
} from "@/features/quotes/actions";
import type { DashboardQuoteListItem } from "@/features/quotes/types";
import type { OptimisticActionResult } from "@/hooks/use-optimistic-mutation";

function isQuoteBulkDeletable(quote: DashboardQuoteListItem) {
  return quote.status === "draft" && !quote.archivedAt;
}

function filterDeletableQuoteIds(
  quotes: DashboardQuoteListItem[],
  ids: string[],
) {
  const idSet = new Set(ids);
  return quotes.filter((quote) => idSet.has(quote.id) && isQuoteBulkDeletable(quote)).map(
    (quote) => quote.id,
  );
}

type QuoteBulkActionsProps = {
  selectedCount: number;
  serializedIds: string;
  quotes: DashboardQuoteListItem[];
  onComplete: () => void;
  onOptimisticRemove?: (
    ids: string[],
    mutation: () => Promise<OptimisticActionResult>,
  ) => void;
};

export function QuoteBulkActions({
  selectedCount,
  serializedIds,
  quotes,
  onComplete,
  onOptimisticRemove,
}: QuoteBulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const ids = serializedIds.split(",").filter(Boolean);

  function buildQuoteIdsFormData(targetIds: string[]) {
    const formData = new FormData();
    formData.set("quoteIds", targetIds.join(","));
    return formData;
  }

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => {
          onOptimisticRemove?.(ids, async () => {
            return bulkArchiveQuotesAction({}, buildQuoteIdsFormData(ids));
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

      <Button
        onClick={() => {
          onOptimisticRemove?.(ids, async () => {
            return bulkVoidQuotesAction({}, buildQuoteIdsFormData(ids));
          });
          onComplete();
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        <Ban data-icon="inline-start" />
        Void
      </Button>

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
          <ResponsiveOverlayFooter>
            <ResponsiveOverlayClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </ResponsiveOverlayClose>
            <Button
              onClick={() => {
                const deletableIds = filterDeletableQuoteIds(quotes, ids);

                if (deletableIds.length === 0) {
                  toast.error(
                    "Only draft, non-archived quotes can be deleted. None of the selected quotes are eligible.",
                  );
                  return;
                }

                const formData = buildQuoteIdsFormData(deletableIds);
                formData.set("confirmed", "true");

                onOptimisticRemove?.(deletableIds, async () =>
                  bulkDeleteQuotesAction({}, formData),
                );
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
