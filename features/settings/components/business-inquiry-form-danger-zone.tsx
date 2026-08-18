"use client";

import { useEffect } from "react";
import { Archive, Trash2 } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { ServerActionConfirmDialog } from "@/components/shared/server-action-button";
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
  const [archiveState, archiveFormAction, isArchivePending] = useActionStateWithSonner(
    archiveAction,
    initialState,
  );

  useEffect(() => {
    if (!archiveState.success) {
      return;
    }

    router.replace(inquiryListHref);
  }, [archiveState.success, inquiryListHref, router]);

  const boundDeleteAction = async (state: BusinessInquiryFormDangerActionState, formData: FormData) => {
    return deleteAction(state, formData);
  };

  return (
    <section className="rounded-xl border border-destructive/25 bg-card/97 shadow-xs">
      <div className="border-b border-border/70 p-4 sm:p-5">
        <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground sm:text-base">
          Danger zone
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-[13px]">
          Archive or permanently delete this form.
        </p>
      </div>

      <div className="divide-y divide-border/60">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Archive form</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
              Hide this form without deleting previously submitted customer inquiries.
            </p>
          </div>
          <div className="shrink-0 self-start sm:self-center">
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
                    Archive form
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive">Delete form</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
              Permanently remove this form. Only available when no inquiries are linked.
            </p>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            <form>
              <input name="targetFormId" type="hidden" value={formId} />
              <ServerActionConfirmDialog
                action={boundDeleteAction}
                confirmLabel="Delete form"
                confirmPendingLabel="Deleting..."
                description="This will permanently delete the form. Forms with linked inquiries must be archived instead."
                icon={Trash2}
                redirectHref={inquiryListHref}
                title="Delete form?"
                triggerLabel="Delete form"
                triggerVariant="destructive"
              />
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
