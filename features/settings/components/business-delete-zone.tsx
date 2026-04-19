"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";

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
import type { BusinessRecordState } from "@/features/businesses/lifecycle";
import type { BusinessRecordActionState } from "@/features/businesses/types";

type BusinessDeleteZoneProps = {
  archiveAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
  activeWorkspaceBusinessCount: number;
  archivedRedirectHref: string;
  businessName: string;
  recordState: BusinessRecordState;
  restoreAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
  trashAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
  trashRedirectHref: string;
  unarchiveAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
};

export function BusinessDeleteZone({
  archiveAction,
  activeWorkspaceBusinessCount,
  archivedRedirectHref,
  businessName,
  recordState,
  restoreAction,
  trashAction,
  trashRedirectHref,
  unarchiveAction,
}: BusinessDeleteZoneProps) {
  const isTrashDisabled =
    recordState === "active" && activeWorkspaceBusinessCount <= 1;

  return (
    <Card className="gap-0 border-border/75 bg-card/97">
      <CardHeader className="gap-2.5 pb-5">
        <CardTitle>Business lifecycle</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
        {recordState === "trash" ? (
          <Alert>
            <AlertTitle>Business is in trash</AlertTitle>
            <AlertDescription>
              {businessName} is hidden from active workspace views and public
              inquiry pages. Restore it to make it active again.
            </AlertDescription>
          </Alert>
        ) : recordState === "archived" ? (
          <Alert>
            <AlertTitle>Business is archived</AlertTitle>
            <AlertDescription>
              Archived businesses stay preserved for history, but they are hidden
              from normal active workspace views.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTitle>Clean up without losing history</AlertTitle>
            <AlertDescription>
              Archive is the safe default. Move a business to trash only when you
              want it removed from normal workspace views.
            </AlertDescription>
          </Alert>
        )}

        {recordState === "trash" ? (
          <div className="dashboard-actions">
            <ServerActionButton
              action={restoreAction}
              icon={RotateCcw}
              label="Restore business"
              pendingLabel="Restoring..."
            />
          </div>
        ) : (
          <div className="dashboard-actions">
            {recordState === "archived" ? (
              <ServerActionButton
                action={unarchiveAction}
                icon={RotateCcw}
                label="Restore business"
                pendingLabel="Restoring..."
              />
            ) : (
              <ServerActionButton
                action={archiveAction}
                icon={Archive}
                label="Archive business"
                pendingLabel="Archiving..."
                redirectHref={archivedRedirectHref}
              />
            )}
            <ServerActionConfirmDialog
              action={trashAction}
              confirmLabel="Move business to trash"
              confirmPendingLabel="Moving..."
              description="This hides the business from active workspace views and public intake, but the business can still be restored later."
              disabled={isTrashDisabled}
              icon={Trash2}
              redirectHref={trashRedirectHref}
              title="Move business to trash?"
              triggerLabel="Move to trash"
              triggerVariant="destructive"
            />
          </div>
        )}

        {isTrashDisabled ? (
          <p className="text-sm text-muted-foreground">
            Keep at least one active business in this workspace before moving this
            one to trash.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
