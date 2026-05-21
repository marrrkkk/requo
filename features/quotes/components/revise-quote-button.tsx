"use client";

import { useActionState } from "react";
import { Edit } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { reviseQuoteAction } from "@/features/quotes/actions";
import type { QuoteRecordActionState } from "@/features/quotes/types";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { useEffect } from "react";

type ReviseQuoteButtonProps = {
  quoteId: string;
};

const initialState: QuoteRecordActionState = {};

export function ReviseQuoteButton({ quoteId }: ReviseQuoteButtonProps) {
  const router = useProgressRouter();
  const boundAction = reviseQuoteAction.bind(null, quoteId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction}>
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
