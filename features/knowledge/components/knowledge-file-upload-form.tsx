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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  knowledgeAllowedExtensions,
  knowledgeFileAccept,
} from "@/features/knowledge/schemas";
import type { KnowledgeFileActionState } from "@/features/knowledge/types";

type KnowledgeFileUploadFormProps = {
  action: (
    state: KnowledgeFileActionState,
    formData: FormData,
  ) => Promise<KnowledgeFileActionState>;
};

const initialState: KnowledgeFileActionState = {};

export function KnowledgeFileUploadForm({
  action,
}: KnowledgeFileUploadFormProps) {
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
          <AlertTitle>We could not upload the file.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <FormSection
        description="Add one reference document at a time so the business and AI assistant can use it later."
        title="File details"
      >
        <FieldGroup>
          <Field data-invalid={Boolean(state.fieldErrors?.title) || undefined}>
            <FieldLabel htmlFor="knowledge-file-title">
              Title
            </FieldLabel>
            <FieldContent>
              <Input
                id="knowledge-file-title"
                maxLength={120}
                minLength={2}
                name="title"
                placeholder="Shipping policy, service scope, intake checklist"
                aria-invalid={Boolean(state.fieldErrors?.title) || undefined}
                disabled={isPending}
              />
              <FieldDescription>
                Optional. Leave it blank to derive a title from the file name.
              </FieldDescription>
              <FieldError
                errors={
                  state.fieldErrors?.title?.[0]
                    ? [{ message: state.fieldErrors.title[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(state.fieldErrors?.file) || undefined}>
            <FieldLabel htmlFor="knowledge-file-upload">File</FieldLabel>
            <FieldContent>
              <Input
                id="knowledge-file-upload"
                name="file"
                type="file"
                accept={knowledgeFileAccept}
                required
                aria-invalid={Boolean(state.fieldErrors?.file) || undefined}
                disabled={isPending}
              />
              <FieldDescription>
                One file at a time. Accepted formats:{" "}
                {knowledgeAllowedExtensions.join(", ")}.
              </FieldDescription>
              <FieldError
                errors={
                  state.fieldErrors?.file?.[0]
                    ? [{ message: state.fieldErrors.file[0] }]
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
              Uploading file...
            </>
          ) : (
            "Upload knowledge file"
          )}
        </Button>
      </FormActions>
    </form>
  );
}
