"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-2.5 pb-6">
          <CardTitle>Workspace profile</CardTitle>
          <CardDescription>
            The name of your workspace as it appears in the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="soft-panel px-5 py-5 shadow-none sm:px-6">
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
                  This is for internal organization only. Your customers will only
                  see your individual business names.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </div>
          <div className="flex justify-end pt-5">
            <Button disabled={isPending} type="submit" variant="default">
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
