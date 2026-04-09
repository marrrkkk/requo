"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  FormActions,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeFaqActionState } from "@/features/knowledge/types";

type KnowledgeFaqFormProps = {
  action: (
    state: KnowledgeFaqActionState,
    formData: FormData,
  ) => Promise<KnowledgeFaqActionState>;
  initialValues?: {
    question: string;
    answer: string;
  };
  submitLabel: string;
  submitPendingLabel: string;
  onSuccess?: () => void;
  idPrefix?: string;
  showSectionHeader?: boolean;
};

const initialState: KnowledgeFaqActionState = {};

export function KnowledgeFaqForm({
  action,
  initialValues,
  submitLabel,
  submitPendingLabel,
  onSuccess,
  idPrefix = "knowledge-faq",
  showSectionHeader = true,
}: KnowledgeFaqFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    if (!initialValues) {
      formRef.current?.reset();
    }

    onSuccess?.();
  }, [initialValues, onSuccess, state.success]);

  return (
    <form action={formAction} className="form-stack" ref={formRef}>
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not save the FAQ.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <AlertTitle>FAQ saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <FormSection title={showSectionHeader ? (initialValues ? "FAQ content" : "New FAQ") : undefined}>
        <FieldGroup>
          <Field data-invalid={Boolean(state.fieldErrors?.question) || undefined}>
            <FieldLabel htmlFor={`${idPrefix}-question`}>Question</FieldLabel>
            <FieldContent>
              <Input
                id={`${idPrefix}-question`}
                name="question"
                defaultValue={initialValues?.question}
                maxLength={240}
                minLength={4}
                placeholder="What turnaround time should we quote?"
                aria-invalid={Boolean(state.fieldErrors?.question) || undefined}
                required
                disabled={isPending}
              />
              <FieldError
                errors={
                  state.fieldErrors?.question?.[0]
                    ? [{ message: state.fieldErrors.question[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(state.fieldErrors?.answer) || undefined}>
            <FieldLabel htmlFor={`${idPrefix}-answer`}>Answer</FieldLabel>
            <FieldContent>
              <Textarea
                id={`${idPrefix}-answer`}
                name="answer"
                rows={5}
                defaultValue={initialValues?.answer}
                maxLength={4000}
                minLength={8}
                placeholder="Share the internal answer the AI assistant should lean on when drafting replies."
                aria-invalid={Boolean(state.fieldErrors?.answer) || undefined}
                required
                disabled={isPending}
              />
              <FieldError
                errors={
                  state.fieldErrors?.answer?.[0]
                    ? [{ message: state.fieldErrors.answer[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      </FormSection>

      <FormActions>
        <Button disabled={isPending} type="submit">
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              {submitPendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </FormActions>
    </form>
  );
}
