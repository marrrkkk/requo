"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCheck, CircleCheck, ClipboardList, ExternalLink, Receipt } from "lucide-react";

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
import { createJobFromQuoteAction, updateJobStatusAction } from "@/features/jobs/actions";
import { createInvoiceFromQuoteAction } from "@/features/invoices/actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import { useProgressRouter } from "@/hooks/use-progress-router";
import {
  getBusinessJobPath,
  getBusinessJobsPath,
  getBusinessInvoicePath,
} from "@/features/businesses/routes";

import type {
  QuoteCompletionActionState,
  QuotePostAcceptanceStatus,
} from "@/features/quotes/types";
import type { JobStatus } from "@/features/jobs/types";

type QuotePostAcceptanceActionsProps = {
  quoteId: string;
  businessSlug: string;
  existingJobId: string | null;
  existingJobStatus: JobStatus | null;
  existingInvoiceId: string | null;
  postAcceptanceStatus: QuotePostAcceptanceStatus;
  completeAction: (
    state: QuoteCompletionActionState,
    formData: FormData,
  ) => Promise<QuoteCompletionActionState>;
};

/**
 * Actions shown on an accepted quote detail page.
 *
 * Layout:
 * - Linked resources row: "Open job" / "Open invoice" links (when they exist)
 * - Actions row: contextual buttons for creating/completing work
 *   - "Create job" when no job exists (owner may have deleted it)
 *   - "Create invoice" when no invoice exists
 *   - "Mark job as complete" when invoice exists but job is still in progress
 *   - "Mark complete" to skip job/invoice and close out the quote
 *
 * Hidden when work is already completed or canceled.
 */
export function QuotePostAcceptanceActions({
  quoteId,
  businessSlug,
  existingJobId,
  existingJobStatus,
  existingInvoiceId,
  postAcceptanceStatus,
  completeAction,
}: QuotePostAcceptanceActionsProps) {
  const [isJobPending, startJobTransition] = useTransition();
  const [isInvoicePending, startInvoiceTransition] = useTransition();
  const [isMarkJobDonePending, startMarkJobDoneTransition] = useTransition();
  const [invoiceId, setInvoiceId] = useState(existingInvoiceId);
  const [jobStatus, setJobStatus] = useState(existingJobStatus);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const router = useProgressRouter();
  const { scheduleRefresh } = useDeferredRefresh();

  const hasJob = Boolean(existingJobId);
  const hasInvoice = Boolean(invoiceId);
  const jobNeedsCompletion = hasJob && hasInvoice && jobStatus !== "done";

  function handleOpenJob() {
    if (existingJobId) {
      router.push(getBusinessJobPath(businessSlug, existingJobId));
    }
  }

  function handleOpenInvoice() {
    if (invoiceId) {
      router.push(getBusinessInvoicePath(businessSlug, invoiceId));
    }
  }

  function handleCreateJob() {
    startJobTransition(async () => {
      const result = await createJobFromQuoteAction(quoteId);
      if (result.success) {
        router.push(getBusinessJobsPath(businessSlug));
      }
    });
  }

  function handleCreateInvoice() {
    startInvoiceTransition(async () => {
      const result = await createInvoiceFromQuoteAction(quoteId);

      if (result.invoiceId) {
        setInvoiceId(result.invoiceId);
        router.push(getBusinessInvoicePath(businessSlug, result.invoiceId));
      }
    });
  }

  function handleMarkJobDone() {
    if (!existingJobId) return;

    startMarkJobDoneTransition(async () => {
      const result = await updateJobStatusAction(existingJobId, "done");
      if (result.success) {
        setJobStatus("done");
        scheduleRefresh();
      }
    });
  }

  // Don't show when work is already done or canceled
  if (postAcceptanceStatus === "completed" || postAcceptanceStatus === "canceled") {
    return null;
  }

  // Hide when job is done and invoice exists — nothing left to do
  if (hasJob && hasInvoice && jobStatus === "done") {
    return null;
  }

  const hasLinkedResources = hasJob || hasInvoice;

  return (
    <>
      <DashboardSection
        contentClassName="flex flex-col gap-4"
        description="Track work or bill the customer for this accepted quote."
        title="Next steps"
      >
        {/* Linked resources — navigation to existing job/invoice */}
        {hasLinkedResources ? (
          <div className="flex flex-wrap items-center gap-2">
            {hasJob ? (
              <Button
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={handleOpenJob}
                size="sm"
                type="button"
                variant="ghost"
              >
                <ClipboardList className="size-3.5" />
                Open job
                <ExternalLink className="size-3 text-muted-foreground" />
              </Button>
            ) : null}
            {hasInvoice ? (
              <Button
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={handleOpenInvoice}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Receipt className="size-3.5" />
                Open invoice
                <ExternalLink className="size-3 text-muted-foreground" />
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {jobNeedsCompletion ? (
            <Button
              className="w-full sm:w-auto"
              disabled={isMarkJobDonePending}
              onClick={handleMarkJobDone}
              type="button"
            >
              {isMarkJobDonePending ? (
                <Spinner className="size-4" aria-hidden="true" />
              ) : (
                <CheckCheck data-icon="inline-start" />
              )}
              Mark job as complete
            </Button>
          ) : null}
          {!hasJob ? (
            <Button
              className="w-full sm:w-auto"
              disabled={isJobPending}
              onClick={handleCreateJob}
              type="button"
              variant="outline"
            >
              {isJobPending ? (
                <Spinner className="size-4" aria-hidden="true" />
              ) : (
                <ClipboardList data-icon="inline-start" />
              )}
              Create job
            </Button>
          ) : null}
          {!hasInvoice ? (
            <Button
              className="w-full sm:w-auto"
              disabled={isInvoicePending}
              onClick={handleCreateInvoice}
              type="button"
              variant="outline"
            >
              {isInvoicePending ? (
                <Spinner className="size-4" aria-hidden="true" />
              ) : (
                <Receipt data-icon="inline-start" />
              )}
              Create invoice
            </Button>
          ) : null}
        </div>

        {/* Skip — mark as done without job/invoice */}
        <p className="text-xs text-muted-foreground">
          Done without tracking?{" "}
          <button
            className="inline text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowCompleteDialog(true)}
            type="button"
          >
            Mark as complete
          </button>
        </p>
      </DashboardSection>

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
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    {} as QuoteCompletionActionState,
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    queueMicrotask(() => onOpenChange(false));
    scheduleRefresh();
  }, [onOpenChange, scheduleRefresh, state.success]);

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
