"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

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
import type { InquiryWorkflowStatus } from "@/features/inquiries/types";
import { inquiryWorkflowStatuses } from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";
import { cn } from "@/lib/utils";

const statusOptions = inquiryWorkflowStatuses;

type InquiryBulkStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serializedIds: string;
  selectedCount: number;
  formAction: (formData: FormData) => void;
  isPending: boolean;
};

export function InquiryBulkStatusDialog({
  open,
  onOpenChange,
  serializedIds,
  selectedCount,
  formAction,
  isPending,
}: InquiryBulkStatusDialogProps) {
  const [targetStatus, setTargetStatus] = useState<InquiryWorkflowStatus | null>(null);

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setTargetStatus(null);
        onOpenChange(nextOpen);
      }}
    >
      <Button
        onClick={() => onOpenChange(true)}
        size="sm"
        type="button"
        variant="outline"
      >
        <RefreshCw data-icon="inline-start" />
        Change status
      </Button>
      <ResponsiveOverlayContent className="sm:max-w-sm">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>
            Change status for {selectedCount} inquiry{selectedCount !== 1 ? "ies" : ""}
          </ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>
            Pick a target status. Archived or deleted inquiries will be skipped.
          </ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        <form action={formAction}>
          <input name="inquiryIds" type="hidden" value={serializedIds} />
          <input name="targetStatus" type="hidden" value={targetStatus ?? ""} />
          <div className="flex flex-col gap-1.5 px-4 pb-4 sm:px-6 sm:pb-6">
            {statusOptions.map((status) => (
              <button
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  targetStatus === status && "bg-accent ring-1 ring-ring/30",
                )}
                key={status}
                onClick={() => setTargetStatus(status)}
                type="button"
              >
                {getInquiryStatusLabel(status)}
              </button>
            ))}
          </div>
          <ResponsiveOverlayFooter>
            <ResponsiveOverlayClose asChild>
              <Button disabled={isPending} type="button" variant="ghost">
                Cancel
              </Button>
            </ResponsiveOverlayClose>
            <Button disabled={isPending || !targetStatus} type="submit">
              {isPending ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              {isPending ? "Updating..." : "Update status"}
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
