"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";

import {
  ServerActionButton,
  ServerActionConfirmDialog,
} from "@/components/shared/server-action-button";
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
  restoreAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
  trashAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
  unarchiveAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
};

export function InquiryRecordActions({
  archiveAction,
  recordState,
  restoreAction,
  trashAction,
  unarchiveAction,
}: InquiryRecordActionsProps) {
  if (recordState === "trash") {
    return (
      <div className="dashboard-actions">
        <ServerActionButton
          action={restoreAction}
          icon={RotateCcw}
          label="Restore request"
          pendingLabel="Restoring..."
        />
      </div>
    );
  }

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
          label="Archive request"
          pendingLabel="Archiving..."
        />
      )}
      <ServerActionConfirmDialog
        action={trashAction}
        confirmLabel="Move to trash"
        confirmPendingLabel="Moving..."
        description="This hides the request from active work queues, but you can restore it later from trash."
        icon={Trash2}
        title="Move to trash?"
        triggerLabel="Move to trash"
        triggerVariant="destructive"
      />
    </div>
  );
}
