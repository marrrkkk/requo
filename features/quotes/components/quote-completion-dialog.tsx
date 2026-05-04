"use client";

import { CircleCheck } from "lucide-react";

import {
  ServerActionConfirmDialog,
} from "@/components/shared/server-action-button";
import type { QuoteCompletionActionState } from "@/features/quotes/types";

type QuoteCompletionDialogProps = {
  action: (
    state: QuoteCompletionActionState,
    formData: FormData,
  ) => Promise<QuoteCompletionActionState>;
  quoteNumber: string;
};

export function QuoteCompletionDialog({
  action,
  quoteNumber,
}: QuoteCompletionDialogProps) {
  return (
    <ServerActionConfirmDialog
      action={action}
      confirmLabel="Mark work completed"
      confirmPendingLabel="Completing..."
      description={`This marks all work for quote ${quoteNumber} as completed. This is a milestone — it confirms the job was fulfilled.`}
      icon={CircleCheck}
      title="Mark work as completed?"
      triggerLabel="Mark work completed"
      triggerVariant="default"
    />
  );
}
