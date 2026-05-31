"use client";

import { useOptimistic, useState } from "react";
import {
  Archive,
  Ban,
  FileText,
  RotateCcw,
  Settings,
  Trash2,
} from "lucide-react";

import { OptimisticPendingIndicator } from "@/components/shared/optimistic-pending-indicator";
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
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import type {
  QuoteLibraryActionState,
  QuoteRecordActionState,
  QuoteStatus,
} from "@/features/quotes/types";

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
  const { runMutation, isPendingKey } = useOptimisticMutation();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const [optimisticIsArchived, setOptimisticIsArchived] = useOptimistic(
    isArchived,
    (_current, nextArchived: boolean) => nextArchived,
  );
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    status,
    (_current, nextStatus: QuoteStatus) => nextStatus,
  );

  function submitArchive() {
    runMutation({
      applyOptimistic: () => {
        setOptimisticIsArchived(true);
      },
      revertOptimistic: () => {
        setOptimisticIsArchived(isArchived);
      },
      mutation: () => archiveAction(initialState, new FormData()),
      pendingKey: "archive",
      refreshOnSuccess: true,
    });
  }

  function submitRestore() {
    runMutation({
      applyOptimistic: () => {
        setOptimisticIsArchived(false);
      },
      revertOptimistic: () => {
        setOptimisticIsArchived(isArchived);
      },
      mutation: () => restoreArchivedAction(initialState, new FormData()),
      pendingKey: "restore",
      refreshOnSuccess: true,
    });
  }

  function submitVoid() {
    runMutation({
      applyOptimistic: () => {
        setOptimisticStatus("voided");
      },
      revertOptimistic: () => {
        setOptimisticStatus(status);
      },
      mutation: () => voidAction(initialState, new FormData()),
      pendingKey: "void",
      refreshOnSuccess: true,
    });
  }

  function submitDelete() {
    runMutation({
      applyOptimistic: () => {},
      revertOptimistic: () => {},
      mutation: async () => {
        const formData = new FormData();
        formData.set("redirectHref", businessQuoteListHref);
        return deleteDraftAction(initialState, formData);
      },
      pendingKey: "delete",
      refreshOnSuccess: false,
      onSuccess: () => {
        window.location.assign(businessQuoteListHref);
      },
    });
  }

  function handleSaveAsTemplate() {
    if (!saveAsTemplateAction || isPendingKey("template")) return;

    runMutation({
      applyOptimistic: () => {},
      revertOptimistic: () => {},
      mutation: saveAsTemplateAction,
      pendingKey: "template",
      refreshOnSuccess: true,
    });
  }

  function handleConfirm() {
    if (confirmAction === "delete") {
      void submitDelete();
    } else if (confirmAction === "void") {
      void submitVoid();
    } else if (confirmAction === "archive") {
      void submitArchive();
    } else if (confirmAction === "restore") {
      void submitRestore();
    }
    setConfirmAction(null);
  }

  const isPending =
    isPendingKey("archive") ||
    isPendingKey("restore") ||
    isPendingKey("delete") ||
    isPendingKey("void") ||
    isPendingKey("template");
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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Manage quote"
            type="button"
            className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="size-5" />
            <OptimisticPendingIndicator pending={isPending} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {saveAsTemplateAction ? (
            <>
              <DropdownMenuItem
                disabled={isPendingKey("template")}
                onSelect={handleSaveAsTemplate}
              >
                <FileText />
                Save as template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {optimisticStatus === "draft" ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmAction("delete")}
            >
              <Trash2 />
              Delete draft
            </DropdownMenuItem>
          ) : (
            <>
              {optimisticIsArchived ? (
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
              {optimisticStatus === "sent" ? (
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
                <OptimisticPendingIndicator pending={isPending} />
                {config?.label}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
