"use client";

import { Archive, Ban, RotateCcw, Trash2 } from "lucide-react";

import {
  ServerActionButton,
  ServerActionConfirmDialog,
} from "@/components/shared/server-action-button";
import type {
  QuoteRecordActionState,
  QuoteStatus,
} from "@/features/quotes/types";

type QuoteLifecycleActionsProps = {
  archiveAction: (
    state: QuoteRecordActionState,
    formData: FormData,
  ) => Promise<QuoteRecordActionState>;
  businessQuoteListHref?: string;
  deleteDraftAction: (
    state: QuoteRecordActionState,
    formData: FormData,
  ) => Promise<QuoteRecordActionState>;
  isArchived: boolean;
  restoreArchivedAction: (
    state: QuoteRecordActionState,
    formData: FormData,
  ) => Promise<QuoteRecordActionState>;
  status: QuoteStatus;
  voidAction: (
    state: QuoteRecordActionState,
    formData: FormData,
  ) => Promise<QuoteRecordActionState>;
};

export function QuoteLifecycleActions({
  archiveAction,
  businessQuoteListHref,
  deleteDraftAction,
  isArchived,
  restoreArchivedAction,
  status,
  voidAction,
}: QuoteLifecycleActionsProps) {
  const destructiveAction =
    status === "draft" ? (
      <ServerActionConfirmDialog
        action={deleteDraftAction}
        confirmLabel="Delete draft quote"
        confirmPendingLabel="Deleting..."
        description="This removes the draft from normal quote views. Sent and historical quotes are preserved instead of deleted."
        icon={Trash2}
        redirectHref={businessQuoteListHref}
        title="Delete draft quote?"
        triggerLabel="Delete draft"
        triggerVariant="destructive"
      />
    ) : status === "sent" ? (
      <ServerActionConfirmDialog
        action={voidAction}
        confirmLabel="Void quote"
        confirmPendingLabel="Voiding..."
        description="Voiding keeps the record for reporting and history, but the customer can no longer accept it online."
        icon={Ban}
        title="Void quote?"
        triggerLabel="Void quote"
        triggerVariant="destructive"
      />
    ) : null;

  if (status === "draft") {
    return (
      <div className="dashboard-actions pt-1">
        {destructiveAction}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="dashboard-actions">
        {isArchived ? (
          <ServerActionButton
            action={restoreArchivedAction}
            icon={RotateCcw}
            label="Restore to active"
            pendingLabel="Restoring..."
          />
        ) : (
          <ServerActionButton
            action={archiveAction}
            icon={Archive}
            label="Archive quote"
            pendingLabel="Archiving..."
          />
        )}
      </div>

      {destructiveAction ? (
        <div className="border-t border-border pt-4">
          <div className="dashboard-actions">{destructiveAction}</div>
        </div>
      ) : null}
    </div>
  );
}
