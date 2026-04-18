"use client";
import { useEffect, useRef } from "react";
import { CheckCircle2, CircleSlash } from "lucide-react";

import {
  FormNote,
  FormSection,
} from "@/components/shared/form-layout";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { getFieldError } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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

  return (
    <form action={formAction} className="form-stack">
      <FormNote>
        <p className="text-sm font-medium text-foreground">
          Respond to this quote
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Accept the quote if everything looks right, or decline it and leave a
          short note so the business owner knows what to adjust.
        </p>
      </FormNote>

      <FormSection
        description="Optional, but helpful if you want anything clarified or adjusted."
        title="Message"
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="public-quote-message">
              Message for the business
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="public-quote-message"
                maxLength={1200}
                name="message"
                rows={4}
                placeholder="Optional note about your decision or any next steps."
                aria-invalid={Boolean(messageError) || undefined}
                disabled={isPending}
              />
              <FieldError
                errors={messageError ? [{ message: messageError }] : undefined}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      </FormSection>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="w-full"
          disabled={isPending}
          name="response"
          type="submit"
          value="accepted"
        >
          <CheckCircle2 data-icon="inline-start" />
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Saving response...
            </>
          ) : (
            "Accept quote"
          )}
        </Button>
        <Button
          className="w-full"
          disabled={isPending}
          name="response"
          type="submit"
          value="rejected"
          variant="outline"
        >
          <CircleSlash data-icon="inline-start" />
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Saving response...
            </>
          ) : (
            "Decline quote"
          )}
        </Button>
      </div>
    </form>
  );
}
