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

export function QuotePostAcceptanceForm({
  action,
  currentStatus,
}: QuotePostAcceptanceFormProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<QuotePostAcceptanceStatus>(currentStatus);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not update the post-acceptance status.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <AlertTitle>Post-acceptance status updated</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

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
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setSelectedStatus(value as QuotePostAcceptanceStatus)
              }
            >
              <SelectTrigger className="w-full" id="quote-post-acceptance-status">
                <SelectValue placeholder="Choose a post-acceptance status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(
                    ["none", "booked", "scheduled"] as const
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {getQuotePostAcceptanceStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
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
