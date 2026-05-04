"use client";

import { useState } from "react";

import { FormActions } from "@/components/shared/form-layout";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
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
  QuotePostAcceptanceActionState,
  QuotePostAcceptanceStatus,
} from "@/features/quotes/types";
import { getQuotePostAcceptanceStatusLabel } from "@/features/quotes/utils";

type QuotePostAcceptanceFormProps = {
  action: (
    state: QuotePostAcceptanceActionState,
    formData: FormData,
  ) => Promise<QuotePostAcceptanceActionState>;
  currentStatus: QuotePostAcceptanceStatus;
};

const initialState: QuotePostAcceptanceActionState = {};
const quotePostAcceptanceOptions = (
  ["none", "booked", "scheduled", "in_progress"] as const
).map((value) => ({
  label: getQuotePostAcceptanceStatusLabel(value),
  value,
}));

export function QuotePostAcceptanceForm({
  action,
  currentStatus,
}: QuotePostAcceptanceFormProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<QuotePostAcceptanceStatus>(currentStatus);
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );

  return (
    <form action={formAction} className="form-stack">
      <input
        name="postAcceptanceStatus"
        type="hidden"
        value={selectedStatus}
      />

      <FieldGroup>
        <Field
          data-invalid={
            Boolean(state.fieldErrors?.postAcceptanceStatus) || undefined
          }
        >
          <FieldLabel htmlFor="quote-post-acceptance-status">
            Move accepted work forward
          </FieldLabel>
          <FieldContent>
            <Combobox
              aria-invalid={
                Boolean(state.fieldErrors?.postAcceptanceStatus) || undefined
              }
              disabled={isPending}
              id="quote-post-acceptance-status"
              value={selectedStatus}
              onValueChange={(value) =>
                setSelectedStatus(value as QuotePostAcceptanceStatus)
              }
              options={quotePostAcceptanceOptions}
              placeholder="Choose a post-acceptance status"
              searchPlaceholder="Search status"
            />
            <FieldError
              errors={
                state.fieldErrors?.postAcceptanceStatus?.[0]
                  ? [{ message: state.fieldErrors.postAcceptanceStatus[0] }]
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
              Saving...
            </>
          ) : (
            "Save post-acceptance status"
          )}
        </Button>
      </FormActions>
    </form>
  );
}
