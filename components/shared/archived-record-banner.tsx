"use client";

import { useEffect, useState } from "react";
import { Archive } from "lucide-react";

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
import { useProgressRouter } from "@/hooks/use-progress-router";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";

type ArchivedRecordBannerProps = {
  /** Label for the record type, e.g. "inquiry" or "quote". */
  recordLabel: string;
  /** Where to navigate after a successful restore. */
  redirectHref: string;
  /** Server action to unarchive the record. */
  unarchiveAction: (
    state: { error?: string; success?: string },
    formData: FormData,
  ) => Promise<{ error?: string; success?: string }>;
};

const initialState: { error?: string; success?: string } = {};

export function ArchivedRecordBanner({
  recordLabel,
  redirectHref,
  unarchiveAction,
}: ArchivedRecordBannerProps) {
  const [open, setOpen] = useState(false);
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    unarchiveAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.replace(redirectHref);
    }
  }, [state.success, redirectHref, router]);

  return (
    <>
      <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/80 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <Archive className="size-3.5 shrink-0" />
          <p className="text-xs font-medium sm:text-sm">
            This {recordLabel} is archived and read-only.
          </p>
        </div>
        <button
          className="shrink-0 text-xs font-bold underline sm:text-sm"
          type="button"
          onClick={() => setOpen(true)}
        >
          Restore
        </button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <form action={formAction}>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore this {recordLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will make the {recordLabel} active again so you can manage
                it normally.
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
                      Restoring...
                    </>
                  ) : (
                    `Restore ${recordLabel}`
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
