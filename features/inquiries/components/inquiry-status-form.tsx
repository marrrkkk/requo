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
  InquiryStatus,
  InquiryStatusActionState,
} from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";

type InquiryStatusFormProps = {
  action: (
    state: InquiryStatusActionState,
    formData: FormData,
  ) => Promise<InquiryStatusActionState>;
  currentStatus: InquiryStatus;
};

const initialState: InquiryStatusActionState = {};

export function InquiryStatusForm({
  action,
  currentStatus,
}: InquiryStatusFormProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<InquiryStatus>(currentStatus);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not update the inquiry.</AlertTitle>
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
          <FieldLabel htmlFor="inquiry-status">Change status</FieldLabel>
          <FieldContent>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as InquiryStatus)}
            >
              <SelectTrigger className="w-full" id="inquiry-status">
                <SelectValue placeholder="Choose a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(
                    [
                      "new",
                      "quoted",
                      "waiting",
                      "won",
                      "lost",
                      "archived",
                    ] as const
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {getInquiryStatusLabel(status)}
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
