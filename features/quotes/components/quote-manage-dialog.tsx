"use client";

import { Archive, Ban, RotateCcw, Settings, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ServerActionButton,
  ServerActionConfirmDialog,
} from "@/components/shared/server-action-button";
import type {
  QuoteRecordActionState,
  QuoteStatus,
} from "@/features/quotes/types";

type QuoteManageDialogProps = {
  archiveAction: (
    state: QuoteRecordActionState,
    formData: FormData,
  ) => Promise<QuoteRecordActionState>;
  businessQuoteListHref: string;
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

export function QuoteManageDialog({
  archiveAction,
  businessQuoteListHref,
  deleteDraftAction,
  isArchived,
  restoreArchivedAction,
  status,
  voidAction,
}: QuoteManageDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="sm:!size-10 sm:!p-0"
        >
          <Settings data-icon="inline-start" className="sm:!m-0" />
          <span className="sm:hidden">Manage</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle>Manage quote</DialogTitle>
          <DialogDescription>
            {status === "draft"
              ? "Delete this draft if it's no longer needed."
              : "Archive or void this quote."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5 pt-1">
          {status === "draft" ? (
            <section className="flex flex-col gap-3">
              <p className="meta-label">Draft actions</p>
              <div className="flex items-center gap-2.5">
                <ServerActionConfirmDialog
                  action={deleteDraftAction}
                  confirmLabel="Delete draft quote"
                  confirmPendingLabel="Deleting..."
                  description="This removes the draft from normal quote views. Sent and historical quotes are preserved."
                  icon={Trash2}
                  redirectHref={businessQuoteListHref}
                  title="Delete draft quote?"
                  triggerLabel="Delete draft"
                  triggerVariant="destructive"
                />
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-3">
              <p className="meta-label">Lifecycle</p>
              <div className="flex items-center gap-2.5">
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
                {status === "sent" ? (
                  <ServerActionConfirmDialog
                    action={voidAction}
                    confirmLabel="Void quote"
                    confirmPendingLabel="Voiding..."
                    description="Voiding keeps the record for history, but the customer can no longer accept it online."
                    icon={Ban}
                    title="Void quote?"
                    triggerLabel="Void quote"
                    triggerVariant="destructive"
                  />
                ) : null}
              </div>
            </section>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
