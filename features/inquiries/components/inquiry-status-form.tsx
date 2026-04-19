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
  InquiryStatusActionState,
  InquiryWorkflowStatus,
} from "@/features/inquiries/types";
import { inquiryWorkflowStatuses } from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";

type InquiryStatusFormProps = {
  action: (
    state: InquiryStatusActionState,
    formData: FormData,
  ) => Promise<InquiryStatusActionState>;
  currentStatus: InquiryWorkflowStatus;
};

const initialState: InquiryStatusActionState = {};
const inquiryStatusOptions = inquiryWorkflowStatuses.map((value) => ({
  label: getInquiryStatusLabel(value),
  value,
}));

export function InquiryStatusForm({
  action,
  currentStatus,
}: InquiryStatusFormProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<InquiryWorkflowStatus>(currentStatus);
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );

  return (
    <form action={formAction} className="form-stack">
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
              onValueChange={(value) =>
                setSelectedStatus(value as InquiryWorkflowStatus)
              }
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
