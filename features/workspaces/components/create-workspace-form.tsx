"use client";

import { useActionState } from "react";

import { FormActions, FormSection } from "@/components/shared/form-layout";
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
import type { CreateWorkspaceActionState } from "@/features/workspaces/types";

type CreateWorkspaceFormProps = {
  action: (
    state: CreateWorkspaceActionState,
    formData: FormData,
  ) => Promise<CreateWorkspaceActionState>;
};

const initialState: CreateWorkspaceActionState = {};

export function CreateWorkspaceForm({
  action,
}: CreateWorkspaceFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const nameError = state.fieldErrors?.name?.[0];

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not create the workspace.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <FormSection
        description="Create a new workspace for a separate brand, business unit, or client-facing setup."
        title="New workspace"
      >
        <FieldGroup>
          <Field data-invalid={Boolean(nameError) || undefined}>
            <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
            <FieldContent>
              <Input
                id="workspace-name"
                name="name"
                placeholder="Northside Signs"
                aria-invalid={Boolean(nameError) || undefined}
                disabled={isPending}
              />
              <FieldError
                errors={nameError ? [{ message: nameError }] : undefined}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      </FormSection>

      <FormActions align="start">
        <Button disabled={isPending} type="submit">
          {isPending ? "Creating workspace..." : "Create workspace"}
        </Button>
      </FormActions>
    </form>
  );
}
