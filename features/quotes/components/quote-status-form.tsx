"use client";

import { useActionState, useState } from "react";

import { FormActions } from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as QuoteStatus)}
            >
              <SelectTrigger className="w-full" id="quote-status">
                <SelectValue placeholder="Choose a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(
                    [
                      "draft",
                      "sent",
                      "accepted",
                      "rejected",
                      "expired",
                    ] as const
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {getQuoteStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
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
