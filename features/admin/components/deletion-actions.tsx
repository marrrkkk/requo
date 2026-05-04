"use client";

import { useActionState } from "react";
import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";

import {
  cancelAdminWorkspaceDeletionAction,
  completeAdminWorkspaceDeletionAction,
  type AdminDeletionActionState,
} from "@/features/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AdminDeletionRequestActionsProps = {
  isDue: boolean;
  workspaceId: string;
  workspaceName: string;
};

function ActionStateAlert({ state }: { state: AdminDeletionActionState }) {
  if (state.success) {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  if (state.error) {
    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>Action failed</AlertTitle>
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }

  return null;
}

export function AdminDeletionRequestActions({
  isDue,
  workspaceId,
  workspaceName,
}: AdminDeletionRequestActionsProps) {
  const [cancelState, cancelAction, isCancelPending] = useActionState(
    cancelAdminWorkspaceDeletionAction,
    {},
  );
  const [completeState, completeAction, isCompletePending] = useActionState(
    completeAdminWorkspaceDeletionAction,
    {},
  );
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form
        action={cancelAction}
        className="rounded-lg border border-border/70 bg-card p-5 shadow-sm"
      >
        <input name="workspaceId" type="hidden" value={workspaceId} />
        <FieldGroup>
          <div>
            <p className="text-base font-semibold text-foreground">
              Cancel deletion request
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Keep this workspace active and clear its scheduled deletion date.
            </p>
          </div>
          <ActionStateAlert state={cancelState} />
          <Field>
            <FieldLabel htmlFor="admin-cancel-deletion-reason">
              Reason
            </FieldLabel>
            <Textarea
              id="admin-cancel-deletion-reason"
              minLength={5}
              name="reason"
              placeholder="Customer support context, billing correction, or owner request"
              required
              rows={4}
            />
            <FieldDescription>
              This reason is stored in the internal admin audit log.
            </FieldDescription>
          </Field>
          <Button disabled={isCancelPending} type="submit" variant="outline">
            <XCircle data-icon="inline-start" className="size-4" />
            {isCancelPending ? "Canceling..." : "Cancel deletion"}
          </Button>
        </FieldGroup>
      </form>

      <form
        action={completeAction}
        className="rounded-lg border border-border/70 bg-card p-5 shadow-sm"
      >
        <input name="workspaceId" type="hidden" value={workspaceId} />
        <FieldGroup>
          <div>
            <p className="text-base font-semibold text-foreground">
              Mark deletion completed
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Only complete deletion after the scheduled time and billing checks.
            </p>
          </div>
          {!isDue ? (
            <Alert>
              <TriangleAlert />
              <AlertTitle>Not due yet</AlertTitle>
              <AlertDescription>
                This request cannot be completed before its scheduled deletion
                time.
              </AlertDescription>
            </Alert>
          ) : null}
          <ActionStateAlert state={completeState} />
          <Field>
            <FieldLabel htmlFor="admin-complete-deletion-confirmation">
              Confirm workspace name
            </FieldLabel>
            <Input
              autoComplete="off"
              disabled={!isDue}
              id="admin-complete-deletion-confirmation"
              name="confirmation"
              placeholder={workspaceName}
              required
            />
            <FieldDescription>
              Type {workspaceName} exactly to confirm this destructive action.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="admin-complete-deletion-reason">
              Reason
            </FieldLabel>
            <Textarea
              disabled={!isDue}
              id="admin-complete-deletion-reason"
              minLength={5}
              name="reason"
              placeholder="Scheduled deletion due and provider billing already resolved"
              required
              rows={4}
            />
          </Field>
          <Button disabled={!isDue || isCompletePending} type="submit" variant="destructive">
            <CheckCircle2 data-icon="inline-start" className="size-4" />
            {isCompletePending ? "Completing..." : "Mark completed"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
