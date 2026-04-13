"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { FormSection } from "@/components/shared/form-layout";
import { Input } from "@/components/ui/input";
import { renameWorkspaceAction } from "@/features/workspaces/actions";
import type { WorkspaceSettingsView } from "@/features/workspaces/types";

type WorkspaceSettingsFormProps = {
  workspace: WorkspaceSettingsView;
};

export function WorkspaceSettingsForm({
  workspace,
}: WorkspaceSettingsFormProps) {
  const [state, action, isPending] = useActionState(renameWorkspaceAction, {});

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
    } else if (state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="workspaceId" value={workspace.id} />
      <FormSection
        description="The name of your workspace as it appears in the dashboard."
        title="Workspace Profile"
      >
        <FieldGroup>
          <Field data-invalid={Boolean(state.fieldErrors?.name) || undefined}>
            <FieldLabel htmlFor="workspace-name-input">Workspace name</FieldLabel>
            <FieldContent>
              <Input
                defaultValue={workspace.name}
                id="workspace-name-input"
                name="name"
                placeholder="My Workspace"
                required
              />
            </FieldContent>
            <FieldDescription>
              This is for internal organization only. Your customers will only see your individual business names.
            </FieldDescription>
          </Field>
        </FieldGroup>
        <div className="flex justify-end pt-5">
          <Button disabled={isPending} type="submit" variant="default">
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </FormSection>
    </form>
  );
}
