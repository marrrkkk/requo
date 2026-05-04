"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createWorkspaceAction } from "@/features/workspaces/actions";
import type { CreateWorkspaceActionState } from "@/features/workspaces/types";

const initialState: CreateWorkspaceActionState = {};

export function CreateWorkspaceForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, action, isPending] = useActionState(
    createWorkspaceAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.success, onSuccess]);

  const nameError = state.fieldErrors?.name?.[0];

  return (
    <form ref={formRef} action={action} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="overflow-y-auto">
        <FieldGroup>
          <Field data-invalid={Boolean(nameError) || undefined}>
            <FieldLabel htmlFor="create-workspace-name">Workspace name</FieldLabel>
            <FieldContent>
              <Input
                id="create-workspace-name"
                name="name"
                placeholder="e.g. Agency Projects"
                required
                minLength={2}
                maxLength={60}
                disabled={isPending}
                aria-invalid={Boolean(nameError) || undefined}
              />
              <FieldError
                errors={nameError ? [{ message: nameError }] : undefined}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
      </DialogBody>

      <DialogFooter>
        <Button disabled={isPending} type="submit">
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Creating…
            </>
          ) : (
            "Create workspace"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
