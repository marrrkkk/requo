"use client";

import { useActionState, useEffect } from "react";
import { Trash2 } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { QuoteLibraryDeleteActionState } from "@/features/quotes/types";

type QuoteLibraryEntryDeleteButtonProps = {
  action: (
    state: QuoteLibraryDeleteActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryDeleteActionState>;
};

const initialState: QuoteLibraryDeleteActionState = {};

export function QuoteLibraryEntryDeleteButton({
  action,
}: QuoteLibraryEntryDeleteButtonProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not delete the entry.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button disabled={isPending} type="submit" variant="destructive">
        <Trash2 data-icon="inline-start" />
        {isPending ? (
          <>
            <Spinner data-icon="inline-start" aria-hidden="true" />
            Deleting...
          </>
        ) : (
          "Delete entry"
        )}
      </Button>
    </form>
  );
}
