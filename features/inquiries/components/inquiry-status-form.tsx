"use client";

import { useOptimistic, useState } from "react";

import { OptimisticPendingIndicator } from "@/components/shared/optimistic-pending-indicator";
import { FormActions } from "@/components/shared/form-layout";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
  const { runMutation, isPendingKey } = useOptimisticMutation();
  const [selectedStatus, setSelectedStatus] =
    useState<InquiryWorkflowStatus>(currentStatus);
  const [fieldErrors, setFieldErrors] = useState<
    InquiryStatusActionState["fieldErrors"]
  >();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    currentStatus,
    (_current, nextStatus: InquiryWorkflowStatus) => nextStatus,
  );

  const isPending = isPendingKey("inquiry-status");

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        runMutation({
          applyOptimistic: () => {
            setOptimisticStatus(selectedStatus);
            setFieldErrors(undefined);
          },
          revertOptimistic: () => {
            setOptimisticStatus(currentStatus);
            setSelectedStatus(currentStatus);
          },
          mutation: async () => {
            const result = await action(initialState, formData);
            if (result.fieldErrors) {
              setFieldErrors(result.fieldErrors);
            }
            return result;
          },
          pendingKey: "inquiry-status",
          refreshOnSuccess: true,
        });
      }}
    >
      <input name="status" type="hidden" value={selectedStatus} />

      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors?.status) || undefined}>
          <FieldLabel htmlFor="inquiry-status">Change status</FieldLabel>
          <FieldContent>
            <Combobox
              aria-invalid={Boolean(fieldErrors?.status) || undefined}
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
                fieldErrors?.status?.[0]
                  ? [{ message: fieldErrors.status[0] }]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <FormActions>
        <Button
          disabled={isPending || selectedStatus === optimisticStatus}
          type="submit"
        >
          <OptimisticPendingIndicator pending={isPending} />
          Save status
        </Button>
      </FormActions>
    </form>
  );
}
