"use client";

import { useActionState } from "react";
import { CheckCircle2, CircleSlash } from "lucide-react";

import { getFieldError } from "@/lib/action-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { PublicQuoteResponseActionState } from "@/features/quotes/types";

type PublicQuoteResponseFormProps = {
  action: (
    state: PublicQuoteResponseActionState,
    formData: FormData,
  ) => Promise<PublicQuoteResponseActionState>;
};

const initialState: PublicQuoteResponseActionState = {};

export function PublicQuoteResponseForm({
  action,
}: PublicQuoteResponseFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const messageError = getFieldError(state.fieldErrors, "message");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not record your response.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <AlertTitle>Response saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-xl border border-border/80 bg-background p-4">
        <p className="text-sm font-medium text-foreground">
          Respond to this quote
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Accept the quote if everything looks right, or decline it and leave a
          short note so the business owner knows what to adjust.
        </p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="public-quote-message">
            Message for the business
          </FieldLabel>
          <FieldContent>
          <Textarea
            id="public-quote-message"
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="w-full"
          disabled={isPending}
          name="response"
          type="submit"
          value="accepted"
        >
          <CheckCircle2 data-icon="inline-start" />
          {isPending ? "Saving response..." : "Accept quote"}
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
          {isPending ? "Saving response..." : "Decline quote"}
        </Button>
      </div>
    </form>
  );
}
