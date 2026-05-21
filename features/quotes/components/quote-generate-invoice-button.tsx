"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Receipt } from "lucide-react";

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
import { createInvoiceFromQuoteAction } from "@/features/invoices/actions";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { getBusinessInvoicePath } from "@/features/businesses/routes";

type QuoteGenerateInvoiceButtonProps = {
  quoteId: string;
  businessSlug: string;
  existingInvoiceId: string | null;
};

export function QuoteGenerateInvoiceButton({
  quoteId,
  businessSlug,
  existingInvoiceId,
}: QuoteGenerateInvoiceButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [invoiceId, setInvoiceId] = useState(existingInvoiceId);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const router = useProgressRouter();

  function handleClick() {
    if (invoiceId) {
      setShowDuplicateDialog(true);
      return;
    }

    startTransition(async () => {
      const result = await createInvoiceFromQuoteAction(quoteId);

      if (result.invoiceId) {
        setInvoiceId(result.invoiceId);
        router.push(getBusinessInvoicePath(businessSlug, result.invoiceId));
      } else if (result.error) {
        setInvoiceId(quoteId); // fallback
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

  return (
    <>
      <Button
        disabled={isPending}
        onClick={handleClick}
        type="button"
        className="w-full sm:w-auto"
      >
        {isPending ? (
          <Spinner className="size-4" aria-hidden="true" />
        ) : (
          <Receipt data-icon="inline-start" />
        )}
        Generate invoice
      </Button>

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
