"use client";

import { useState } from "react";
import { Ban } from "lucide-react";

import { FormActions } from "@/components/shared/form-layout";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type { QuoteCancellationActionState } from "@/features/quotes/types";
import { quoteCancellationReasons } from "@/features/quotes/schemas";

type QuoteCancellationDialogProps = {
  action: (
    state: QuoteCancellationActionState,
    formData: FormData,
  ) => Promise<QuoteCancellationActionState>;
  quoteNumber: string;
};

const initialState: QuoteCancellationActionState = {};

const cancellationReasonLabels: Record<
  (typeof quoteCancellationReasons)[number],
  string
> = {
  customer_changed_mind: "Customer changed mind",
  price_too_high: "Price too high",
  schedule_conflict: "Schedule conflict",
  scope_changed: "Scope changed",
  no_deposit_payment: "No deposit/payment",
  duplicate_mistake: "Duplicate/mistake",
  business_unavailable: "Business unavailable",
  other: "Other",
};

const cancellationReasonOptions = quoteCancellationReasons.map((value) => ({
  label: cancellationReasonLabels[value],
  value,
}));

export function QuoteCancellationDialog({
  action,
  quoteNumber,
}: QuoteCancellationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Ban data-icon="inline-start" />
          Mark as canceled
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel accepted work?</DialogTitle>
          <DialogDescription>
            This marks quote {quoteNumber} as canceled after acceptance. The
            quote record stays accepted for historical accuracy.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="form-stack">
          <input
            name="cancellationReason"
            type="hidden"
            value={selectedReason}
          />

          <FieldGroup>
            <Field
              data-invalid={
                Boolean(state.fieldErrors?.cancellationReason) || undefined
              }
            >
              <FieldLabel htmlFor="cancellation-reason">
                Why is this work being canceled?
              </FieldLabel>
              <FieldContent>
                <Combobox
                  aria-invalid={
                    Boolean(state.fieldErrors?.cancellationReason) || undefined
                  }
                  disabled={isPending}
                  id="cancellation-reason"
                  value={selectedReason}
                  onValueChange={setSelectedReason}
                  options={cancellationReasonOptions}
                  placeholder="Choose a reason"
                  searchPlaceholder="Search reasons"
                />
                <FieldError
                  errors={
                    state.fieldErrors?.cancellationReason?.[0]
                      ? [{ message: state.fieldErrors.cancellationReason[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <Field
              data-invalid={
                Boolean(state.fieldErrors?.cancellationNote) || undefined
              }
            >
              <FieldLabel htmlFor="cancellation-note">
                Notes <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  disabled={isPending}
                  id="cancellation-note"
                  name="cancellationNote"
                  placeholder="Any additional context about this cancellation."
                  rows={3}
                />
                <FieldError
                  errors={
                    state.fieldErrors?.cancellationNote?.[0]
                      ? [{ message: state.fieldErrors.cancellationNote[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <FormActions>
            <Button
              disabled={isPending || !selectedReason}
              type="submit"
              variant="destructive"
            >
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Canceling...
                </>
              ) : (
                "Confirm cancellation"
              )}
            </Button>
          </FormActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
