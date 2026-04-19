"use client";

import { CalendarClock, ShieldAlert, Trash2, Undo2 } from "lucide-react";

import {
  ServerActionButton,
  ServerActionConfirmDialog,
} from "@/components/shared/server-action-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  WorkspaceDeletionActionState,
  WorkspaceDeletionPreflight,
} from "@/features/workspaces/types";

type WorkspaceDeletionPanelProps = {
  cancelDeletionAction: (
    state: WorkspaceDeletionActionState,
    formData: FormData,
  ) => Promise<WorkspaceDeletionActionState>;
  requestDeletionAction: (
    state: WorkspaceDeletionActionState,
    formData: FormData,
  ) => Promise<WorkspaceDeletionActionState>;
  preflight: WorkspaceDeletionPreflight;
};

export function WorkspaceDeletionPanel({
  cancelDeletionAction,
  requestDeletionAction,
  preflight,
}: WorkspaceDeletionPanelProps) {
  const hasBlockers = preflight.blockers.length > 0;
  const willScheduleDeletion = preflight.effectiveDeletionAt !== null;

  return (
    <Card className="gap-0 border-destructive/20 bg-card/97">
      <CardHeader className="gap-2.5 pb-5">
        <CardTitle>Workspace deletion</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
        {preflight.state === "scheduled_for_deletion" ? (
          <Alert>
            <CalendarClock data-icon="inline-start" />
            <AlertTitle>Workspace deletion is scheduled</AlertTitle>
            <AlertDescription>
              {preflight.workspaceName} will be deleted on{" "}
              {formatDateTime(preflight.scheduledDeletionAt)} unless you cancel the
              schedule first.
            </AlertDescription>
          </Alert>
        ) : hasBlockers ? (
          <Alert variant="destructive">
            <ShieldAlert data-icon="inline-start" />
            <AlertTitle>Deletion is blocked</AlertTitle>
            <AlertDescription>
              Resolve the blockers below before deleting this workspace.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTitle>High-risk action</AlertTitle>
            <AlertDescription>
              Workspace deletion does not cancel billing for you. Cancel the
              subscription first when required, then return here to schedule or
              complete deletion safely.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2 text-sm text-muted-foreground">
          <p>
            {preflight.businessCount} business
            {preflight.businessCount === 1 ? "" : "es"} will stay preserved for
            history.
          </p>
          <p>
            {preflight.memberCount} workspace member
            {preflight.memberCount === 1 ? "" : "s"} currently have access.
          </p>
          {preflight.subscription ? (
            <p className="capitalize">
              Subscription status: {preflight.subscription.status.replace(/_/g, " ")}.
            </p>
          ) : (
            <p>No paid subscription is attached to this workspace.</p>
          )}
        </div>

        {hasBlockers ? (
          <div className="grid gap-3">
            {preflight.blockers.map((blocker, index) => (
              <Alert key={`${blocker.code}-${index}`}>
                <AlertTitle>Blocked</AlertTitle>
                <AlertDescription>{blocker.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        ) : preflight.state === "scheduled_for_deletion" ? (
          <div className="dashboard-actions">
            <ServerActionButton
              action={cancelDeletionAction}
              icon={Undo2}
              label="Cancel scheduled deletion"
              pendingLabel="Cancelling..."
            />
          </div>
        ) : (
          <div className="dashboard-actions">
            <ServerActionConfirmDialog
              action={requestDeletionAction}
              confirmLabel={willScheduleDeletion ? "Schedule deletion" : "Delete workspace"}
              confirmPendingLabel={willScheduleDeletion ? "Scheduling..." : "Deleting..."}
              description={
                willScheduleDeletion
                  ? `This workspace will be scheduled for deletion after the current billing period ends on ${formatDateTime(
                      preflight.effectiveDeletionAt,
                    )}.`
                  : "This will remove the workspace from normal product access. Billing state is not changed here."
              }
              icon={Trash2}
              title={willScheduleDeletion ? "Schedule workspace deletion?" : "Delete workspace?"}
              triggerLabel="Delete workspace"
              triggerVariant="destructive"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return "the next billing cycle";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
