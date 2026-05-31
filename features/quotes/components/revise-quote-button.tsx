"use client";

import { Edit } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { reviseQuoteAction } from "@/features/quotes/actions";
import type { QuoteRecordActionState } from "@/features/quotes/types";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";

type ReviseQuoteButtonProps = {
  quoteId: string;
};

const initialState: QuoteRecordActionState = {};

export function ReviseQuoteButton({ quoteId }: ReviseQuoteButtonProps) {
  const { runMutation, isPendingKey } = useOptimisticMutation();
  const boundAction = reviseQuoteAction.bind(null, quoteId);
  const isPending = isPendingKey("revise");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    runMutation({
      applyOptimistic: () => {},
      revertOptimistic: () => {},
      mutation: () => boundAction(initialState, new FormData()),
      pendingKey: "revise",
      refreshOnSuccess: true,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <Spinner data-icon="inline-start" aria-hidden="true" />
        ) : (
          <Edit data-icon="inline-start" />
        )}
        Create revision
      </Button>
    </form>
  );
}
