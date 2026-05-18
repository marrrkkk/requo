"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Check,
  RotateCcw,
  Settings,
  Trash2,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";
import {
  inquiryWorkflowStatuses,
  type InquiryRecordActionState,
  type InquiryRecordState,
  type InquiryStatusActionState,
  type InquiryWorkflowStatus,
} from "@/features/inquiries/types";

type InquiryManageDropdownProps = {
  workflowStatus: InquiryWorkflowStatus;
  recordState: InquiryRecordState;
  businessInquiryListHref: string;
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
  deleteAction: (
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
};

type ConfirmAction = "status" | "archive" | "unarchive" | "delete" | null;

const initialStatusState: InquiryStatusActionState = {};
const initialRecordState: InquiryRecordActionState = {};

export function InquiryManageDropdown({
  workflowStatus,
  recordState,
  businessInquiryListHref,
  statusAction,
  archiveAction,
  unarchiveAction,
  deleteAction,
}: InquiryManageDropdownProps) {
  const router = useProgressRouter();
  const statusFormRef = useRef<HTMLFormElement>(null);
  const archiveFormRef = useRef<HTMLFormElement>(null);
  const unarchiveFormRef = useRef<HTMLFormElement>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const [selectedStatus, setSelectedStatus] = useState(workflowStatus);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const [statusState, statusFormAction, isStatusPending] = useActionStateWithSonner(
    statusAction,
    initialStatusState,
  );
  const [archiveState, archiveFormAction, isArchivePending] = useActionStateWithSonner(
    archiveAction,
    initialRecordState,
  );
  const [unarchiveState, unarchiveFormAction, isUnarchivePending] = useActionStateWithSonner(
    unarchiveAction,
    initialRecordState,
  );
  const [deleteState, deleteFormAction, isDeletePending] = useActionStateWithSonner(
    deleteAction,
    initialRecordState,
  );

  useEffect(() => {
    if (statusState.success || archiveState.success || unarchiveState.success) {
      router.refresh();
    }
  }, [statusState.success, archiveState.success, unarchiveState.success, router]);

  useEffect(() => {
    if (deleteState.success) {
      router.replace(businessInquiryListHref);
    }
  }, [deleteState.success, businessInquiryListHref, router]);

  function handleStatusSelect(status: string) {
    if (status === workflowStatus) return;
    setSelectedStatus(status as InquiryWorkflowStatus);
    setConfirmAction("status");
  }

  function handleConfirm() {
    if (confirmAction === "status") {
      setTimeout(() => statusFormRef.current?.requestSubmit(), 0);
    } else if (confirmAction === "archive") {
      archiveFormRef.current?.requestSubmit();
    } else if (confirmAction === "unarchive") {
      unarchiveFormRef.current?.requestSubmit();
    } else if (confirmAction === "delete") {
      deleteFormRef.current?.requestSubmit();
    }
    setConfirmAction(null);
  }

  const isPending = isStatusPending || isArchivePending || isUnarchivePending || isDeletePending;
  const isDestructive = confirmAction === "delete";

  const confirmConfig: Record<Exclude<ConfirmAction, null>, { title: string; description: string; label: string }> = {
    status: {
      title: `Change status to "${getInquiryStatusLabel(selectedStatus)}"?`,
      description: `This will update the workflow status from "${getInquiryStatusLabel(workflowStatus)}" to "${getInquiryStatusLabel(selectedStatus)}".`,
      label: "Change status",
    },
    archive: {
      title: "Archive this inquiry?",
      description: "Archived inquiries are hidden from the active list. You can restore them later.",
      label: "Archive",
    },
    unarchive: {
      title: "Restore this inquiry?",
      description: "This will move the inquiry back to the active list.",
      label: "Restore",
    },
    delete: {
      title: "Delete this inquiry?",
      description: "This permanently removes the inquiry from active views. This action cannot be undone.",
      label: "Delete",
    },
  };

  const config = confirmAction ? confirmConfig[confirmAction] : null;

  return (
    <>
      {/* Hidden forms for server actions */}
      <form ref={statusFormRef} action={statusFormAction} className="hidden">
        <input name="status" type="hidden" value={selectedStatus} />
      </form>
      <form ref={archiveFormRef} action={archiveFormAction} className="hidden" />
      <form ref={unarchiveFormRef} action={unarchiveFormAction} className="hidden" />
      <form ref={deleteFormRef} action={deleteFormAction} className="hidden" />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Manage inquiry"
            type="button"
            className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {recordState === "active" ? (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40">
                  {inquiryWorkflowStatuses.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onSelect={() => handleStatusSelect(status)}
                    >
                      <span className="flex w-full items-center justify-between">
                        {getInquiryStatusLabel(status)}
                        {status === workflowStatus ? (
                          <Check className="size-3.5 text-muted-foreground" />
                        ) : null}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem onSelect={() => setConfirmAction("archive")}>
                <Archive />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmAction("delete")}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => setConfirmAction("unarchive")}>
                <RotateCcw />
                Restore to active
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmAction("delete")}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation dialog */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{config?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {config?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button disabled={isPending} variant="outline">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={isPending}
                onClick={handleConfirm}
                variant={isDestructive ? "destructive" : "default"}
              >
                {isPending ? (
                  <>
                    <Spinner className="size-4" aria-hidden="true" />
                    {config?.label}...
                  </>
                ) : (
                  config?.label
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
