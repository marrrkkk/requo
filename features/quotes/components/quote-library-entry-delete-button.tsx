"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { QuoteLibraryDeleteActionState } from "@/features/quotes/types";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";

type QuoteLibraryEntryDeleteButtonProps = {
  action: (
    state: QuoteLibraryDeleteActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryDeleteActionState>;
  label?: string;
};

const initialState: QuoteLibraryDeleteActionState = {};

export function QuoteLibraryEntryDeleteButton({
  action,
  label = "Delete entry",
}: QuoteLibraryEntryDeleteButtonProps) {
  const { runMutation, isPendingKey } = useOptimisticMutation();
  const isPending = isPendingKey("delete");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    runMutation({
      applyOptimistic: () => {},
      revertOptimistic: () => {},
      mutation: async () => {
        const result = await action(initialState, new FormData());
        if (result.error) {
          return { error: result.error };
        }
        if (result.success) {
          return { success: "Entry deleted." };
        }
        return {};
      },
      pendingKey: "delete",
      refreshOnSuccess: true,
    });
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <Button disabled={isPending} type="submit" variant="destructive">
        <Trash2 data-icon="inline-start" />
        {isPending ? (
          <>
            <Spinner data-icon="inline-start" aria-hidden="true" />
            Deleting...
          </>
        ) : (
          label
        )}
      </Button>
    </form>
  );
}
