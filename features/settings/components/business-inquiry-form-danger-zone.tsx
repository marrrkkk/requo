"use client";

import { Archive, Trash2 } from "lucide-react";

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

export function BusinessInquiryFormDangerZone({
  archiveAction,
  deleteAction,
  formId,
  inquiryListHref,
}: BusinessInquiryFormDangerZoneProps) {
  return (
    <section className="rounded-xl border border-destructive/25 bg-card/97 shadow-xs">
      <div className="border-b border-border/70 p-4 sm:p-5">
        <h3 className="font-heading text-sm font-semibold tracking-tight text-foreground sm:text-base">
          Danger zone
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          Archive or permanently delete this form.
        </p>
      </div>

      <div className="divide-y divide-border/60">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Archive form</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Hide this form without deleting previously submitted customer inquiries.
            </p>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            <ServerActionConfirmDialog
              action={archiveAction}
              confirmLabel="Archive form"
              confirmPendingLabel="Archiving..."
              confirmVariant="default"
              description="Archived forms are hidden from active views but keep all submitted inquiries. You can restore the form later."
              formValues={{ targetFormId: formId }}
              icon={Archive}
              redirectHref={inquiryListHref}
              title="Archive this form?"
              triggerLabel="Archive form"
              triggerVariant="outline"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive">Delete form</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Permanently remove this form. Only available when no inquiries are linked.
            </p>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            <ServerActionConfirmDialog
              action={deleteAction}
              confirmLabel="Delete form"
              confirmPendingLabel="Deleting..."
              description="This will permanently delete the form. Forms with linked inquiries must be archived instead."
              formValues={{ targetFormId: formId }}
              icon={Trash2}
              redirectHref={inquiryListHref}
              title="Delete form?"
              triggerLabel="Delete form"
              triggerVariant="destructive"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
