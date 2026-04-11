"use client";

import { useState } from "react";

import { FormActions } from "@/components/shared/form-layout";
import { useActionStateWithSuccessToast } from "@/hooks/use-action-state-with-success-toast";
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
const inquiryStatusOptions = (
  [
    "new",
    "quoted",
    "waiting",
    "won",
    "lost",
    "archived",
  ] as const
).map((value) => ({
  label: getInquiryStatusLabel(value),
  value,
}));

export function InquiryStatusForm({
  action,
  currentStatus,
}: InquiryStatusFormProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<InquiryStatus>(currentStatus);
  const [state, formAction, isPending] = useActionStateWithSuccessToast(
    action,
    initialState,
  );

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not update the inquiry.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}


      <input name="status" type="hidden" value={selectedStatus} />

      <FieldGroup>
        <Field data-invalid={Boolean(state.fieldErrors?.status) || undefined}>
          <FieldLabel htmlFor="inquiry-status">Change status</FieldLabel>
          <FieldContent>
            <Combobox
              aria-invalid={Boolean(state.fieldErrors?.status) || undefined}
              disabled={isPending}
              id="inquiry-status"
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as InquiryStatus)}
              options={inquiryStatusOptions}
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
