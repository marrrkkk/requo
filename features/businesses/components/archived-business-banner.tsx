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
import type { BusinessRecordActionState } from "@/features/businesses/types";

type ArchivedBusinessBannerProps = {
  dashboardHref: string;
  unarchiveAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
};

const initialState: BusinessRecordActionState = {};

export function ArchivedBusinessBanner({
  dashboardHref,
  unarchiveAction,
}: ArchivedBusinessBannerProps) {
  const [open, setOpen] = useState(false);
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    unarchiveAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.replace(dashboardHref);
    }
  }, [state.success, dashboardHref, router]);

  return (
    <>
      <div className="sticky top-[3.5rem] z-30 flex w-full items-center justify-between gap-2 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-amber-900 sm:px-6 dark:border-amber-700/40 dark:bg-amber-950/80 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <Archive className="size-3.5 shrink-0" />
          <p className="text-xs font-medium sm:text-sm">
            This business is archived and read-only.
          </p>
        </div>
        <button
          className="shrink-0 text-xs font-bold underline sm:text-sm"
          data-allow-archived
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
              <AlertDialogTitle>Restore this business?</AlertDialogTitle>
              <AlertDialogDescription>
                This will make the business active again. You&apos;ll be able to
                manage inquiries, quotes, and settings.
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
                    "Restore business"
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
