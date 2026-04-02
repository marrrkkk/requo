"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
    <form action={formAction} className="flex flex-col gap-4">
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

      <Button
        disabled={isPending || selectedStatus === currentStatus}
        type="submit"
      >
        {isPending ? "Updating status..." : "Save status"}
      </Button>
    </form>
  );
}
