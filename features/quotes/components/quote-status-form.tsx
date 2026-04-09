"use client";

import { useActionState, useState } from "react";

import { FormActions } from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type {
  QuoteStatus,
  QuoteStatusActionState,
} from "@/features/quotes/types";
import { getQuoteStatusLabel } from "@/features/quotes/utils";

type QuoteStatusFormProps = {
  action: (
    state: QuoteStatusActionState,
    formData: FormData,
  ) => Promise<QuoteStatusActionState>;
  currentStatus: QuoteStatus;
};

const initialState: QuoteStatusActionState = {};
const quoteStatusOptions = (
  [
    "draft",
    "sent",
    "accepted",
    "rejected",
    "expired",
  ] as const
).map((value) => ({
  label: getQuoteStatusLabel(value),
  value,
}));

export function QuoteStatusForm({
  action,
  currentStatus,
}: QuoteStatusFormProps) {
  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus>(currentStatus);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not update the quote.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <AlertTitle>Status updated</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <input name="status" type="hidden" value={selectedStatus} />

      <FieldGroup>
        <Field data-invalid={Boolean(state.fieldErrors?.status) || undefined}>
          <FieldLabel htmlFor="quote-status">Change status</FieldLabel>
          <FieldContent>
            <Combobox
              aria-invalid={Boolean(state.fieldErrors?.status) || undefined}
              disabled={isPending}
              id="quote-status"
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as QuoteStatus)}
              options={quoteStatusOptions}
              placeholder="Choose a status"
              searchPlaceholder="Search status"
            />
            <FieldError
              errors={
                state.fieldErrors?.status?.[0]
                  ? [{ message: state.fieldErrors.status[0] }]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <FormActions>
        <Button
          disabled={isPending || selectedStatus === currentStatus}
          type="submit"
        >
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Updating status...
            </>
          ) : (
            "Save status"
          )}
        </Button>
      </FormActions>
    </form>
  );
}
