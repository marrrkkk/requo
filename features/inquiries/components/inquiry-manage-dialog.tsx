"use client";

import { Archive, RotateCcw, Settings, Trash2 } from "lucide-react";

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
import { InquiryStatusForm } from "@/features/inquiries/components/inquiry-status-form";
import {
  ServerActionButton,
  ServerActionConfirmDialog,
} from "@/components/shared/server-action-button";
import type {
  InquiryRecordActionState,
  InquiryRecordState,
  InquiryStatusActionState,
  InquiryWorkflowStatus,
} from "@/features/inquiries/types";

type InquiryManageDialogProps = {
  workflowStatus: InquiryWorkflowStatus;
  recordState: InquiryRecordState;
  statusAction: (
    state: InquiryStatusActionState,
    formData: FormData,
  ) => Promise<InquiryStatusActionState>;
  archiveAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
  unarchiveAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
  trashAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
  restoreAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
};

export function InquiryManageDialog({
  workflowStatus,
  recordState,
  statusAction,
  archiveAction,
  unarchiveAction,
  trashAction,
  restoreAction,
}: InquiryManageDialogProps) {
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
          <DialogTitle>Manage inquiry</DialogTitle>
          <DialogDescription>
            Update status or organize this inquiry.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-6 pt-1">
          {recordState === "active" ? (
            <>
              <section className="flex flex-col gap-3">
                <p className="meta-label">Workflow status</p>
                <InquiryStatusForm
                  key={workflowStatus}
                  action={statusAction}
                  currentStatus={workflowStatus}
                />
              </section>

              <div className="border-t border-border/50" />

              <section className="flex flex-col gap-3">
                <p className="meta-label">Organize</p>
                <div className="flex items-center gap-2.5">
                  <ServerActionButton
                    action={archiveAction}
                    icon={Archive}
                    label="Archive"
                    pendingLabel="Archiving..."
                  />
                  <ServerActionConfirmDialog
                    action={trashAction}
                    confirmLabel="Move to trash"
                    confirmPendingLabel="Moving..."
                    description="This hides the inquiry from active work. You can restore it later."
                    icon={Trash2}
                    title="Move to trash?"
                    triggerLabel="Trash"
                    triggerVariant="destructive"
                  />
                </div>
              </section>
            </>
          ) : (
            <section className="flex flex-col gap-3">
              <div className="soft-panel flex flex-col gap-2 px-4 py-4 shadow-none">
                <p className="text-sm font-medium text-foreground">
                  {recordState === "archived"
                    ? "This inquiry is archived."
                    : "This inquiry is in trash."}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Restore it to change the workflow status.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {recordState === "archived" ? (
                  <ServerActionButton
                    action={unarchiveAction}
                    icon={RotateCcw}
                    label="Restore to active"
                    pendingLabel="Restoring..."
                  />
                ) : (
                  <ServerActionButton
                    action={restoreAction}
                    icon={RotateCcw}
                    label="Restore inquiry"
                    pendingLabel="Restoring..."
                  />
                )}
                {recordState === "archived" ? (
                  <ServerActionConfirmDialog
                    action={trashAction}
                    confirmLabel="Move to trash"
                    confirmPendingLabel="Moving..."
                    description="This hides the inquiry from active work. You can restore it later."
                    icon={Trash2}
                    title="Move to trash?"
                    triggerLabel="Trash"
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
