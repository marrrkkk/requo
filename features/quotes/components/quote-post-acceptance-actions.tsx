"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CircleCheck, ClipboardList, Receipt } from "lucide-react";

import { DashboardSection } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { createJobFromQuoteAction } from "@/features/jobs/actions";
import { createInvoiceFromQuoteAction } from "@/features/invoices/actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import {
  getBusinessJobsPath,
  getBusinessInvoicePath,
} from "@/features/businesses/routes";

import type {
  QuoteCompletionActionState,
  QuotePostAcceptanceStatus,
} from "@/features/quotes/types";

type QuotePostAcceptanceActionsProps = {
  quoteId: string;
  businessSlug: string;
  hasJob: boolean;
  existingInvoiceId: string | null;
  postAcceptanceStatus: QuotePostAcceptanceStatus;
  completeAction: (
    state: QuoteCompletionActionState,
    formData: FormData,
  ) => Promise<QuoteCompletionActionState>;
};

/**
 * Actions shown on an accepted quote detail page.
 * The owner can create a job (to track work) or invoice directly.
 * Hidden when work is already completed or canceled.
 */
export function QuotePostAcceptanceActions({
  quoteId,
  businessSlug,
  hasJob,
  existingInvoiceId,
  postAcceptanceStatus,
  completeAction,
}: QuotePostAcceptanceActionsProps) {
  const [isJobPending, startJobTransition] = useTransition();
  const [isInvoicePending, startInvoiceTransition] = useTransition();
  const [invoiceId, setInvoiceId] = useState(existingInvoiceId);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const router = useProgressRouter();

  function handleCreateJob() {
    startJobTransition(async () => {
      const result = await createJobFromQuoteAction(quoteId);
      if (result.success) {
        router.push(getBusinessJobsPath(businessSlug));
      }
    });
  }

  function handleInvoiceNow() {
    if (invoiceId) {
      setShowDuplicateDialog(true);
      return;
    }

    startInvoiceTransition(async () => {
      const result = await createInvoiceFromQuoteAction(quoteId);

      if (result.invoiceId) {
        setInvoiceId(result.invoiceId);
        router.push(getBusinessInvoicePath(businessSlug, result.invoiceId));
      } else if (result.error) {
        setInvoiceId(quoteId); // fallback; server already has it
        setShowDuplicateDialog(true);
      }
    });
  }

  function handleGoToInvoice() {
    if (invoiceId) {
      router.push(getBusinessInvoicePath(businessSlug, invoiceId));
    }
    setShowDuplicateDialog(false);
  }

  // Don't show when work is already done or canceled
  if (postAcceptanceStatus === "completed" || postAcceptanceStatus === "canceled") {
    return null;
  }

  if (hasJob && existingInvoiceId) {
    return null;
  }

  return (
    <>
      <DashboardSection
        contentClassName="flex flex-col gap-3"
        description="Track work or bill the customer for this accepted quote."
        title="Next steps"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {!hasJob && (
            <Button
              className="w-full sm:w-auto"
              disabled={isJobPending || isInvoicePending}
              onClick={handleCreateJob}
              type="button"
            >
              {isJobPending ? (
                <Spinner className="size-4" aria-hidden="true" />
              ) : (
                <ClipboardList data-icon="inline-start" />
              )}
              Create job
            </Button>
          )}
          <Button
            className="w-full sm:w-auto"
            disabled={isInvoicePending || isJobPending}
            onClick={handleInvoiceNow}
            type="button"
            variant="outline"
          >
            {isInvoicePending ? (
              <Spinner className="size-4" aria-hidden="true" />
            ) : (
              <Receipt data-icon="inline-start" />
            )}
            Invoice now
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => setShowCompleteDialog(true)}
            type="button"
            variant="outline"
          >
            <CircleCheck data-icon="inline-start" />
            Mark complete
          </Button>
        </div>
      </DashboardSection>

      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" aria-hidden="true" />
              Invoice already exists
            </DialogTitle>
            <DialogDescription>
              An invoice has already been created for this quote. Creating another would result in a duplicate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleGoToInvoice}>
              Go to invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CompleteQuoteDialog
        action={completeAction}
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
      />
    </>
  );
}

function CompleteQuoteDialog({
  action,
  open,
  onOpenChange,
}: {
  action: QuotePostAcceptanceActionsProps["completeAction"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    {} as QuoteCompletionActionState,
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    queueMicrotask(() => onOpenChange(false));
    router.refresh();
  }, [onOpenChange, router, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark work as completed?</DialogTitle>
          <DialogDescription>
            This marks the work as completed without creating an invoice. Use
            this when the work is done and no invoice is needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isPending} type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <form action={formAction}>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Completing...
                </>
              ) : (
                <>
                  <CircleCheck data-icon="inline-start" />
                  Mark complete
                </>
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
