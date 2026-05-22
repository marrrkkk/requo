"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ClipboardList, Receipt } from "lucide-react";

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
import { useProgressRouter } from "@/hooks/use-progress-router";
import {
  getBusinessJobsPath,
  getBusinessInvoicePath,
} from "@/features/businesses/routes";

import type { QuotePostAcceptanceStatus } from "@/features/quotes/types";

type QuotePostAcceptanceActionsProps = {
  quoteId: string;
  businessSlug: string;
  hasJob: boolean;
  existingInvoiceId: string | null;
  postAcceptanceStatus: QuotePostAcceptanceStatus;
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
}: QuotePostAcceptanceActionsProps) {
  const [isJobPending, startJobTransition] = useTransition();
  const [isInvoicePending, startInvoiceTransition] = useTransition();
  const [invoiceId, setInvoiceId] = useState(existingInvoiceId);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
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
    </>
  );
}
