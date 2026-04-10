"use client";

import { useEffect } from "react";
import { Archive, Trash2 } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessInquiryFormDangerActionState } from "@/features/settings/types";

type BusinessInquiryFormDangerZoneProps = {
  activeFormCount: number;
  archiveAction: (
    state: BusinessInquiryFormDangerActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormDangerActionState>;
  deleteAction: (
    state: BusinessInquiryFormDangerActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormDangerActionState>;
  formId: string;
  inquiryListHref: string;
  isDefault: boolean;
  submittedInquiryCount: number;
};

const initialState: BusinessInquiryFormDangerActionState = {};

export function BusinessInquiryFormDangerZone({
  activeFormCount,
  archiveAction,
  deleteAction,
  formId,
  inquiryListHref,
  isDefault,
  submittedInquiryCount,
}: BusinessInquiryFormDangerZoneProps) {
  const router = useProgressRouter();
  const [deleteState, deleteFormAction, isDeletePending] = useActionStateWithSonner(
    deleteAction,
    initialState,
  );
  const [archiveState, archiveFormAction, isArchivePending] = useActionStateWithSonner(
    archiveAction,
    initialState,
  );
  const canMutate = !isDefault && activeFormCount > 1;
  const shouldArchive = submittedInquiryCount > 0;

  useEffect(() => {
    if (!deleteState.success && !archiveState.success) {
      return;
    }

    router.replace(inquiryListHref);
    router.refresh();
  }, [archiveState.success, deleteState.success, inquiryListHref, router]);

  return (
    <Card className="gap-0 border-destructive/25 bg-card/97">
      <CardHeader className="gap-3 pb-5">
        <CardTitle>Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {isDefault ? (
          <Alert>
            <AlertTitle>This is the default form.</AlertTitle>
            <AlertDescription>
              Set another form as default before deleting or archiving this one.
            </AlertDescription>
          </Alert>
        ) : null}

        {!isDefault && activeFormCount <= 1 ? (
          <Alert>
            <AlertTitle>Keep one active form.</AlertTitle>
            <AlertDescription>
              Create another form before removing this one.
            </AlertDescription>
          </Alert>
        ) : null}

        {canMutate ? (
          shouldArchive ? (
            <>
              <Alert>
                <AlertTitle>Archive this form</AlertTitle>
                <AlertDescription>
                  This form already has {submittedInquiryCount} linked inquiries, so it can
                  only be archived.
                </AlertDescription>
              </Alert>
              <form action={archiveFormAction}>
                <input name="targetFormId" type="hidden" value={formId} />
                <Button
                  className="w-full"
                  disabled={isArchivePending}
                  type="submit"
                  variant="outline"
                >
                  {isArchivePending ? (
                    <>
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                      Archiving...
                    </>
                  ) : (
                    <>
                      <Archive data-icon="inline-start" />
                      Archive form
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertTitle>Delete this form</AlertTitle>
                <AlertDescription>
                  This permanently deletes the form because it has no submitted inquiries.
                </AlertDescription>
              </Alert>
              <form action={deleteFormAction}>
                <input name="targetFormId" type="hidden" value={formId} />
                <Button
                  className="w-full"
                  disabled={isDeletePending}
                  type="submit"
                  variant="destructive"
                >
                  {isDeletePending ? (
                    <>
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 data-icon="inline-start" />
                      Delete form
                    </>
                  )}
                </Button>
              </form>
            </>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
