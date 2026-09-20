"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import type { QuoteCompletionActionState } from "@/features/quotes/types";

type CompleteAcceptedQuoteButtonProps = {
  completeAction: (
    state: QuoteCompletionActionState,
    formData: FormData,
  ) => Promise<QuoteCompletionActionState>;
};

const initialState: QuoteCompletionActionState = {};

export function CompleteAcceptedQuoteButton({
  completeAction,
}: CompleteAcceptedQuoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [, formAction, isPending] = useActionStateWithSonner(
    completeAction,
    initialState,
  );

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <CheckCircle2 data-icon="inline-start" />
        Mark as completed
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <form action={formAction}>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark this work as completed?</AlertDialogTitle>
              <AlertDialogDescription>
                This closes out the accepted quote without requiring an
                invoice. Use this when no further billing or tracking is
                needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button disabled={isPending} type="button" variant="outline">
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button disabled={isPending} type="submit">
                  {isPending ? (
                    <>
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                      Completing...
                    </>
                  ) : (
                    "Mark as completed"
                  )}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
