"use client";

import { Archive, RotateCcw } from "lucide-react";

import { ServerActionButton } from "@/components/shared/server-action-button";
import type {
  InquiryRecordActionState,
  InquiryRecordState,
} from "@/features/inquiries/types";

type InquiryRecordActionsProps = {
  archiveAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
  recordState: InquiryRecordState;
  unarchiveAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
};

export function InquiryRecordActions({
  archiveAction,
  recordState,
  unarchiveAction,
}: InquiryRecordActionsProps) {
  return (
    <div className="dashboard-actions">
      {recordState === "archived" ? (
        <ServerActionButton
          action={unarchiveAction}
          icon={RotateCcw}
          label="Restore to active"
          pendingLabel="Restoring..."
        />
      ) : (
        <ServerActionButton
          action={archiveAction}
          icon={Archive}
          label="Archive inquiry"
          pendingLabel="Archiving..."
        />
      )}
    </div>
  );
}
