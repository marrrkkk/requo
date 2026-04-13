"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createWorkspaceAction } from "@/features/workspaces/actions";
import type { CreateWorkspaceActionState } from "@/features/workspaces/types";

const initialState: CreateWorkspaceActionState = {};

export function CreateWorkspaceForm() {
  const [state, action, isPending] = useActionState(
    createWorkspaceAction,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={Boolean(state.fieldErrors?.name) || undefined}>
          <FieldLabel htmlFor="create-workspace-name">Workspace name</FieldLabel>
          <FieldContent>
            <Input
              id="create-workspace-name"
              name="name"
              placeholder="e.g. Agency Projects"
              required
              minLength={2}
              maxLength={60}
            />
          </FieldContent>
        </Field>
      </FieldGroup>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button disabled={isPending} type="submit">
        {isPending ? "Creating..." : "Create workspace"}
      </Button>
    </form>
  );
}
