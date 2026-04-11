"use client";

import { useEffect, useRef } from "react";

import { FormActions, FormSection } from "@/components/shared/form-layout";
import { useActionStateWithSuccessToast } from "@/hooks/use-action-state-with-success-toast";
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
import type { ReplySnippetActionState } from "@/features/inquiries/reply-snippet-types";

type ReplySnippetFormProps = {
  action: (
    state: ReplySnippetActionState,
    formData: FormData,
  ) => Promise<ReplySnippetActionState>;
  initialValues?: {
    title: string;
    body: string;
  };
  submitLabel: string;
  submitPendingLabel: string;
  onSuccess?: () => void;
  idPrefix?: string;
  showSectionHeader?: boolean;
};

const initialState: ReplySnippetActionState = {};

export function ReplySnippetForm({
  action,
  initialValues,
  submitLabel,
  submitPendingLabel,
  onSuccess,
  idPrefix = "reply-snippet",
  showSectionHeader = true,
}: ReplySnippetFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionStateWithSuccessToast(
    action,
    initialState,
  );

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
          <AlertTitle>We could not save the snippet.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}


      <FormSection title={showSectionHeader ? (initialValues ? "Snippet content" : "New reply snippet") : undefined}>
        <FieldGroup>
          <Field data-invalid={Boolean(state.fieldErrors?.title) || undefined}>
            <FieldLabel htmlFor={`${idPrefix}-title`}>Title</FieldLabel>
            <FieldContent>
              <Input
                id={`${idPrefix}-title`}
                name="title"
                defaultValue={initialValues?.title}
                maxLength={120}
                minLength={2}
                placeholder="Ask for missing dimensions"
                required
                aria-invalid={Boolean(state.fieldErrors?.title) || undefined}
                disabled={isPending}
              />
              <FieldError
                errors={
                  state.fieldErrors?.title?.[0]
                    ? [{ message: state.fieldErrors.title[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(state.fieldErrors?.body) || undefined}>
            <FieldLabel htmlFor={`${idPrefix}-body`}>Snippet</FieldLabel>
            <FieldContent>
              <Textarea
                id={`${idPrefix}-body`}
                name="body"
                rows={5}
                defaultValue={initialValues?.body}
                maxLength={2000}
                minLength={1}
                placeholder="Thanks for sending this over. To price this accurately, could you confirm the final dimensions and whether installation should be included?"
                required
                aria-invalid={Boolean(state.fieldErrors?.body) || undefined}
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
