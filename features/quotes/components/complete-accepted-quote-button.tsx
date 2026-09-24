"use client";

import { CheckCircle2 } from "lucide-react";

import { ServerActionConfirmDialog } from "@/components/shared/server-action-button";
import type { QuoteCompletionActionState } from "@/features/quotes/types";

type CompleteAcceptedQuoteButtonProps = {
  completeAction: (
    state: QuoteCompletionActionState,
    formData: FormData,
  ) => Promise<QuoteCompletionActionState>;
};

export function CompleteAcceptedQuoteButton({
  completeAction,
}: CompleteAcceptedQuoteButtonProps) {
  return (
    <ServerActionConfirmDialog
      action={completeAction}
      confirmLabel="Mark work done"
      confirmPendingLabel="Completing..."
      confirmVariant="default"
      description="This closes out the accepted quote without requiring an invoice. Use this when no further billing or tracking is needed."
      icon={CheckCircle2}
      title="Mark this work as done?"
      triggerLabel="Mark work done"
      triggerVariant="outline"
    />
  );
}
