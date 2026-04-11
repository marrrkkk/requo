"use client";
import { SendHorizontal } from "lucide-react";

import {
  FormActions,
  FormNote,
} from "@/components/shared/form-layout";
import { useActionStateWithSuccessToast } from "@/hooks/use-action-state-with-success-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
  const [state, formAction, isPending] = useActionStateWithSuccessToast(
    action,
    initialState,
  );

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not send the quote.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <FormNote>
        <p className="text-sm font-medium text-foreground">Send to customer</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Quote delivery uses Resend and sends directly to {customerEmail}. Save
          the draft first if you changed any line items or totals.
        </p>
      </FormNote>

      <FormActions>
        <Button disabled={disabled || isPending} type="submit">
          <SendHorizontal data-icon="inline-start" />
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Sending quote...
            </>
          ) : (
            "Send quote email"
          )}
        </Button>
      </FormActions>
    </form>
  );
}
