"use client";

import { useActionState } from "react";
import { SendHorizontal } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { QuoteSendActionState } from "@/features/quotes/types";

type QuoteSendFormProps = {
  action: (
    state: QuoteSendActionState,
    formData: FormData,
  ) => Promise<QuoteSendActionState>;
  customerEmail: string;
  disabled?: boolean;
};

const initialState: QuoteSendActionState = {};

export function QuoteSendForm({
  action,
  customerEmail,
  disabled = false,
}: QuoteSendFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not send the quote.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <AlertTitle>Quote sent</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-3xl border bg-background/80 p-4">
        <p className="text-sm font-medium text-foreground">Send to customer</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Quote delivery uses Resend and sends directly to {customerEmail}. Save
          the draft first if you changed any line items or totals.
        </p>
      </div>

      <Button disabled={disabled || isPending} type="submit">
        <SendHorizontal data-icon="inline-start" />
        {isPending ? "Sending quote..." : "Send quote email"}
      </Button>
    </form>
  );
}
