"use client";

import { useEffect } from "react";
import { Archive, Trash2 } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
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
    <section className="rounded-xl border border-destructive/30 bg-card/97">
      <div className="border-b border-destructive/20 px-4 py-3 sm:px-5">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Danger zone
        </h3>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          Archive or permanently delete this form.
        </p>
      </div>

      <div className="divide-y divide-border/70">
        <div className="flex flex-col gap-2.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Archive form</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Hide this form without deleting submitted inquiries.
            </p>
          </div>
          <form action={archiveFormAction}>
            <input name="targetFormId" type="hidden" value={formId} />
            <Button
              disabled={isArchivePending}
              size="sm"
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
                  Archive
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-2.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-destructive">Delete form</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Permanently removes the form and unlinks submitted inquiries.
            </p>
          </div>
          <form action={deleteFormAction}>
            <input name="targetFormId" type="hidden" value={formId} />
            <Button
              disabled={isDeletePending}
              size="sm"
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
                  Delete
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
