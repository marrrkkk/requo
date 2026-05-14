"use client";
import { useEffect, useRef, useState } from "react";
import { Check, CircleSlash } from "lucide-react";

import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { getFieldError } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type {
  PublicQuoteResolvedSnapshot,
  PublicQuoteResponseActionState,
} from "@/features/quotes/types";

type PublicQuoteResponseFormProps = {
  action: (
    state: PublicQuoteResponseActionState,
    formData: FormData,
  ) => Promise<PublicQuoteResponseActionState>;
  onResolved?: (snapshot: PublicQuoteResolvedSnapshot) => void;
};

const initialState: PublicQuoteResponseActionState = {};

export function PublicQuoteResponseForm({
  action,
  onResolved,
}: PublicQuoteResponseFormProps) {
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const messageError = getFieldError(state.fieldErrors, "message");
  const lastResolvedKeyRef = useRef<string | null>(null);
  const [submittedResponse, setSubmittedResponse] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    if (!state.resolvedQuote) {
      return;
    }

    const key = `${state.resolvedQuote.status}:${state.resolvedQuote.customerRespondedAt}`;

    if (lastResolvedKeyRef.current === key) {
      return;
    }

    lastResolvedKeyRef.current = key;
    onResolved?.(state.resolvedQuote);
  }, [onResolved, state.resolvedQuote]);

  const pendingAccept = isPending && submittedResponse === "accepted";
  const pendingDecline = isPending && submittedResponse === "rejected";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Action buttons first — most important on mobile */}
      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={isPending}
          name="response"
          size="lg"
          type="submit"
          value="accepted"
          onClick={() => { setSubmittedResponse("accepted"); }}
        >
          {pendingAccept ? (
            <Spinner data-icon="inline-start" aria-hidden="true" />
          ) : (
            <Check data-icon="inline-start" />
          )}
          Accept
        </Button>
        <Button
          className="flex-1"
          disabled={isPending}
          name="response"
          size="lg"
          type="submit"
          value="rejected"
          variant="outline"
          onClick={() => { setSubmittedResponse("rejected"); }}
        >
          {pendingDecline ? (
            <Spinner data-icon="inline-start" aria-hidden="true" />
          ) : (
            <CircleSlash data-icon="inline-start" />
          )}
          Decline
        </Button>
      </div>

      {/* Optional message */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="public-quote-message"
          className="text-sm text-muted-foreground"
        >
          Message (optional)
        </label>
        <Textarea
          id="public-quote-message"
          maxLength={1200}
          name="message"
          rows={2}
          placeholder="Add a note about your decision..."
          aria-invalid={Boolean(messageError) || undefined}
          disabled={isPending}
          className="text-sm"
        />
        {messageError ? (
          <p className="text-xs text-destructive">{messageError}</p>
        ) : null}
      </div>
    </form>
  );
}
