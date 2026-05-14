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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessInquiryFormDangerActionState } from "@/features/settings/types";

type BusinessInquiryFormDangerZoneProps = {
  activeFormCount?: number;
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
  isDefault?: boolean;
  submittedInquiryCount?: number;
};

const initialState: BusinessInquiryFormDangerActionState = {};

export function BusinessInquiryFormDangerZone({
  archiveAction,
  deleteAction,
  formId,
  inquiryListHref,
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

  useEffect(() => {
    if (!deleteState.success && !archiveState.success) {
      return;
    }

    router.replace(inquiryListHref);
  }, [archiveState.success, deleteState.success, inquiryListHref, router]);

  return (
    <Card className="gap-0 border-destructive/25 bg-card/97">
      <CardHeader className="gap-1.5 pb-5">
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>
          Archive or permanently delete this form.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <Alert variant="destructive">
          <AlertTitle>Delete this form</AlertTitle>
          <AlertDescription>
            This permanently deletes the form and unlinks any submitted inquiries.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3">
          <form action={archiveFormAction}>
            <input name="targetFormId" type="hidden" value={formId} />
            <Button
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

          <form action={deleteFormAction}>
            <input name="targetFormId" type="hidden" value={formId} />
            <Button
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
        </div>
      </CardContent>
    </Card>
  );
}
