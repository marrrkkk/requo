"use client";

import { useEffect, useRef } from "react";

import {
  FormActions,
  FormSection,
} from "@/components/shared/form-layout";
import { useActionStateWithSuccessToast } from "@/hooks/use-action-state-with-success-toast";
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
import { Textarea } from "@/components/ui/textarea";
import type { InquiryNoteActionState } from "@/features/inquiries/types";

type InquiryNoteFormProps = {
  action: (
    state: InquiryNoteActionState,
    formData: FormData,
  ) => Promise<InquiryNoteActionState>;
  embedded?: boolean;
};

const initialState: InquiryNoteActionState = {};

export function InquiryNoteForm({
  action,
  embedded = false,
}: InquiryNoteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionStateWithSuccessToast(
    action,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form action={formAction} className="form-stack" ref={formRef}>
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not save the note.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}


      {embedded ? (
        <FieldGroup>
          <Field data-invalid={Boolean(state.fieldErrors?.body) || undefined}>
            <FieldLabel htmlFor="inquiry-note">Add an internal note</FieldLabel>
            <FieldContent>
              <Textarea
                id="inquiry-note"
                maxLength={2000}
                minLength={1}
                name="body"
                rows={4}
                placeholder="Capture follow-ups, scope clarifications, or internal context for the next reply."
                aria-invalid={Boolean(state.fieldErrors?.body) || undefined}
                required
                disabled={isPending}
              />
              <FieldError
                errors={
                  state.fieldErrors?.body?.[0]
                    ? [{ message: state.fieldErrors.body[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      ) : (
        <FormSection
          description="Visible only inside the business."
          title="Internal note"
        >
          <FieldGroup>
            <Field data-invalid={Boolean(state.fieldErrors?.body) || undefined}>
              <FieldLabel htmlFor="inquiry-note">Add an internal note</FieldLabel>
              <FieldContent>
                <Textarea
                  id="inquiry-note"
                  maxLength={2000}
                  minLength={1}
                  name="body"
                  rows={4}
                  placeholder="Capture follow-ups, scope clarifications, or internal context for the next reply."
                  aria-invalid={Boolean(state.fieldErrors?.body) || undefined}
                  required
                  disabled={isPending}
                />
                <FieldError
                  errors={
                    state.fieldErrors?.body?.[0]
                      ? [{ message: state.fieldErrors.body[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        </FormSection>
      )}

      <FormActions>
        <Button disabled={isPending} type="submit">
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Saving note...
            </>
          ) : (
            "Add note"
          )}
        </Button>
      </FormActions>
    </form>
  );
}
