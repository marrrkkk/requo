"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Ban,
  FileText,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  QuoteLibraryActionState,
  QuoteRecordActionState,
  QuoteStatus,
} from "@/features/quotes/types";
import { toast } from "sonner";

type QuoteManageDropdownProps = {
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
  saveAsTemplateAction?: () => Promise<QuoteLibraryActionState>;
  status: QuoteStatus;
  voidAction: (
    state: QuoteRecordActionState,
    formData: FormData,
  ) => Promise<QuoteRecordActionState>;
};

type ConfirmAction = "delete" | "void" | "archive" | "restore" | null;

const initialState: QuoteRecordActionState = {};

export function QuoteManageDropdown({
  archiveAction,
  businessQuoteListHref,
  deleteDraftAction,
  isArchived,
  restoreArchivedAction,
  saveAsTemplateAction,
  status,
  voidAction,
}: QuoteManageDropdownProps) {
  const router = useProgressRouter();
  const archiveFormRef = useRef<HTMLFormElement>(null);
  const restoreFormRef = useRef<HTMLFormElement>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const voidFormRef = useRef<HTMLFormElement>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const [archiveState, archiveFormAction, isArchivePending] = useActionStateWithSonner(
    archiveAction,
    initialState,
  );
  const [restoreState, restoreFormAction, isRestorePending] = useActionStateWithSonner(
    restoreArchivedAction,
    initialState,
  );
  const [deleteState, deleteFormAction, isDeletePending] = useActionStateWithSonner(
    deleteDraftAction,
    initialState,
  );
  const [voidState, voidFormAction, isVoidPending] = useActionStateWithSonner(
    voidAction,
    initialState,
  );

  useEffect(() => {
    if (archiveState.success || restoreState.success || voidState.success) {
      router.refresh();
    }
  }, [archiveState.success, restoreState.success, voidState.success, router]);

  useEffect(() => {
    if (deleteState.success) {
      router.replace(businessQuoteListHref);
    }
  }, [deleteState.success, businessQuoteListHref, router]);

  function handleConfirm() {
    if (confirmAction === "delete") {
      deleteFormRef.current?.requestSubmit();
    } else if (confirmAction === "void") {
      voidFormRef.current?.requestSubmit();
    } else if (confirmAction === "archive") {
      archiveFormRef.current?.requestSubmit();
    } else if (confirmAction === "restore") {
      restoreFormRef.current?.requestSubmit();
    }
    setConfirmAction(null);
  }

  async function handleSaveAsTemplate() {
    if (!saveAsTemplateAction || isSavingTemplate) return;
    setIsSavingTemplate(true);
    try {
      const result = await saveAsTemplateAction();
      if (result.success) {
        toast.success(result.success);
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    } finally {
      setIsSavingTemplate(false);
    }
  }

  const isPending = isArchivePending || isRestorePending || isDeletePending || isVoidPending || isSavingTemplate;
  const isDestructive = confirmAction === "delete" || confirmAction === "void";

  const confirmConfig: Record<Exclude<ConfirmAction, null>, { title: string; description: string; label: string }> = {
    delete: {
      title: "Delete draft quote?",
      description: "This removes the draft from normal quote views. Sent and historical quotes are preserved.",
      label: "Delete draft",
    },
    void: {
      title: "Void this quote?",
      description: "Voiding keeps the record for history, but the customer can no longer accept it online.",
      label: "Void quote",
    },
    archive: {
      title: "Archive this quote?",
      description: "Archived quotes are hidden from the active list. You can restore them later.",
      label: "Archive",
    },
    restore: {
      title: "Restore this quote?",
      description: "This will move the quote back to the active list.",
      label: "Restore",
    },
  };

  const config = confirmAction ? confirmConfig[confirmAction] : null;

  return (
    <>
      {/* Hidden forms for server actions */}
      <form ref={archiveFormRef} action={archiveFormAction} className="hidden" />
      <form ref={restoreFormRef} action={restoreFormAction} className="hidden" />
      <form ref={deleteFormRef} action={deleteFormAction} className="hidden" />
      <form ref={voidFormRef} action={voidFormAction} className="hidden" />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Manage quote"
            type="button"
            className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {saveAsTemplateAction ? (
            <>
              <DropdownMenuItem
                disabled={isSavingTemplate}
                onSelect={handleSaveAsTemplate}
              >
                <FileText />
                Save as template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {status === "draft" ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmAction("delete")}
            >
              <Trash2 />
              Delete draft
            </DropdownMenuItem>
          ) : (
            <>
              {isArchived ? (
                <DropdownMenuItem onSelect={() => setConfirmAction("restore")}>
                  <RotateCcw />
                  Restore to active
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setConfirmAction("archive")}>
                  <Archive />
                  Archive
                </DropdownMenuItem>
              )}
              {status === "sent" ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setConfirmAction("void")}
                  >
                    <Ban />
                    Void quote
                  </DropdownMenuItem>
                </>
              ) : null}
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
