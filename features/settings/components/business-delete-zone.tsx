"use client";

import { useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ServerActionButton,
  ServerActionConfirmDialog,
} from "@/components/shared/server-action-button";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import type { BusinessRecordState } from "@/features/businesses/lifecycle";
import type { BusinessRecordActionState } from "@/features/businesses/types";

type BusinessDeleteZoneProps = {
  archiveAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
  businessName: string;
  deleteAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
  recordState: BusinessRecordState;
  restoreAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
  unarchiveAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
};

const initialState: BusinessRecordActionState = {};

export function BusinessDeleteZone({
  archiveAction,
  businessName,
  deleteAction,
  recordState,
  restoreAction,
  unarchiveAction,
}: BusinessDeleteZoneProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleteState, deleteFormAction, isDeletePending] =
    useActionStateWithSonner(deleteAction, initialState);
  const confirmationMatches =
    confirmation.trim().toLowerCase() === businessName.trim().toLowerCase();

  return (
    <>
      <section className="rounded-xl border border-destructive/30 bg-card/97">
        <div className="border-b border-destructive/20 px-6 py-4">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Danger zone
          </h3>
        </div>

        <div className="divide-y divide-border">
          {/* Archive / Restore row */}
          {recordState === "archived" ? (
            <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Restore this business
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Make this business active and editable again.
                </p>
              </div>
              <ServerActionButton
                action={unarchiveAction}
                icon={RotateCcw}
                label="Restore"
                pendingLabel="Restoring..."
              />
            </div>
          ) : recordState === "trash" ? (
            <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Restore this business
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Bring this business back from trash.
                </p>
              </div>
              <ServerActionButton
                action={restoreAction}
                icon={RotateCcw}
                label="Restore"
                pendingLabel="Restoring..."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Archive this business
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Make it read-only and hide from active views. You can restore
                  it later.
                </p>
              </div>
              <ServerActionConfirmDialog
                action={archiveAction}
                confirmLabel="Archive business"
                confirmPendingLabel="Archiving..."
                confirmVariant="default"
                description="Archived businesses are read-only and hidden from active views. You can restore it later."
                icon={Archive}
                title="Archive this business?"
                triggerLabel="Archive"
                triggerVariant="outline"
              />
            </div>
          )}

          {/* Delete row */}
          <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Delete this business
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Permanently remove all data including inquiries, quotes, and
                forms. This cannot be undone.
              </p>
            </div>
            <Button
              className="shrink-0"
              type="button"
              variant="destructive"
              onClick={() => setOpen(true)}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        </div>
      </section>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <form action={deleteFormAction}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete business permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes {businessName}, all its inquiries,
                quotes, forms, and follow-ups. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogBody>
              <FieldGroup>
                <Field
                  data-invalid={
                    Boolean(deleteState.fieldErrors?.confirmation) || undefined
                  }
                >
                  <FieldLabel htmlFor="business-delete-confirmation">
                    Type the business name to confirm
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      autoComplete="off"
                      disabled={isDeletePending}
                      id="business-delete-confirmation"
                      name="confirmation"
                      onChange={(event) => setConfirmation(event.target.value)}
                      placeholder={businessName}
                      value={confirmation}
                    />
                    <FieldDescription>
                      Enter <strong>{businessName}</strong> to confirm.
                    </FieldDescription>
                    <FieldError
                      errors={
                        deleteState.fieldErrors?.confirmation?.[0]
                          ? [
                              {
                                message:
                                  deleteState.fieldErrors.confirmation[0],
                              },
                            ]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </AlertDialogBody>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button disabled={isDeletePending} type="button" variant="outline">
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  disabled={isDeletePending || !confirmationMatches}
                  type="submit"
                  variant="destructive"
                >
                  {isDeletePending ? (
                    <>
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                      Deleting...
                    </>
                  ) : (
                    "Delete business"
                  )}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
