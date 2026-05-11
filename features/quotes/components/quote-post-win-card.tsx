"use client";

import { useEffect, useState } from "react";
import { Ban, CircleCheck } from "lucide-react";

import { DashboardSection } from "@/components/shared/dashboard-layout";
import { FormActions } from "@/components/shared/form-layout";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { quoteCancellationReasons } from "@/features/quotes/schemas";
import type {
  QuoteCancellationActionState,
  QuoteCompletionActionState,
  QuotePostAcceptanceStatus,
} from "@/features/quotes/types";
import { formatQuoteDateTime } from "@/features/quotes/utils";
import { cn } from "@/lib/utils";

type QuotePostWinCardProps = {
  quoteNumber: string;
  postAcceptanceStatus: QuotePostAcceptanceStatus;
  completedAt: Date | null;
  canceledAt: Date | null;
  cancellationReason: string | null;
  cancellationNote: string | null;
  completeAction: (
    state: QuoteCompletionActionState,
    formData: FormData,
  ) => Promise<QuoteCompletionActionState>;
  cancelAction: (
    state: QuoteCancellationActionState,
    formData: FormData,
  ) => Promise<QuoteCancellationActionState>;
  className?: string;
};

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

export function QuotePostWinCard({
  quoteNumber,
  postAcceptanceStatus,
  completedAt,
  canceledAt,
  cancellationReason,
  cancellationNote,
  completeAction,
  cancelAction,
  className,
}: QuotePostWinCardProps) {
  const isCompleted = postAcceptanceStatus === "completed";
  const isCanceled = postAcceptanceStatus === "canceled";
  const isTerminal = isCompleted || isCanceled;

  return (
    <DashboardSection
      className={className}
      contentClassName="flex flex-col gap-4"
      description={
        isCompleted
          ? "This work has been completed."
          : isCanceled
            ? "This accepted quote was canceled."
            : "Record the outcome once the work is done or no longer proceeding."
      }
      title={
        isCompleted
          ? "Work completed"
          : isCanceled
            ? "Canceled after acceptance"
            : "Post-win outcome"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <QuotePostAcceptanceStatusBadge status={postAcceptanceStatus} />
        {isCompleted && completedAt ? (
          <span className="text-xs text-muted-foreground">
            {formatQuoteDateTime(completedAt)}
          </span>
        ) : null}
        {isCanceled && canceledAt ? (
          <span className="text-xs text-muted-foreground">
            {formatQuoteDateTime(canceledAt)}
          </span>
        ) : null}
      </div>

      {isTerminal ? (
        isCanceled && cancellationReason ? (
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Cancellation reason</p>
            <p className="mt-2 text-sm text-foreground">
              {cancellationReasonLabels[
                cancellationReason as (typeof quoteCancellationReasons)[number]
              ] ?? cancellationReason}
            </p>
            {cancellationNote ? (
              <>
                <p className="meta-label mt-3">Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-normal sm:leading-7 text-foreground">
                  {cancellationNote}
                </p>
              </>
            ) : null}
          </div>
        ) : null
      ) : (
        <OutcomePicker
          quoteNumber={quoteNumber}
          completeAction={completeAction}
          cancelAction={cancelAction}
        />
      )}
    </DashboardSection>
  );
}

function OutcomePicker({
  quoteNumber,
  completeAction,
  cancelAction,
}: {
  quoteNumber: string;
  completeAction: QuotePostWinCardProps["completeAction"];
  cancelAction: QuotePostWinCardProps["cancelAction"];
}) {
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          className="w-full sm:w-auto"
          onClick={() => setCompleteDialogOpen(true)}
          type="button"
        >
          <CircleCheck data-icon="inline-start" />
          Mark completed
        </Button>
        <Button
          className="w-full sm:w-auto"
          onClick={() => setCancelDialogOpen(true)}
          type="button"
          variant="outline"
        >
          <Ban data-icon="inline-start" />
          Mark canceled
        </Button>
      </div>

      <CompleteQuoteDialog
        action={completeAction}
        onOpenChange={setCompleteDialogOpen}
        open={completeDialogOpen}
        quoteNumber={quoteNumber}
      />

      <CancelQuoteDialog
        action={cancelAction}
        onOpenChange={setCancelDialogOpen}
        open={cancelDialogOpen}
        quoteNumber={quoteNumber}
      />
    </>
  );
}

function CompleteQuoteDialog({
  action,
  open,
  onOpenChange,
  quoteNumber,
}: {
  action: QuotePostWinCardProps["completeAction"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteNumber: string;
}) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    {} as QuoteCompletionActionState,
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    queueMicrotask(() => onOpenChange(false));
    router.refresh();
  }, [onOpenChange, router, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark work as completed?</DialogTitle>
          <DialogDescription>
            This marks all work for quote {quoteNumber} as completed. This is a
            milestone — it confirms the job was fulfilled.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isPending} type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <form action={formAction}>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Completing...
                </>
              ) : (
                <>
                  <CircleCheck data-icon="inline-start" />
                  Mark work completed
                </>
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelQuoteDialog({
  action,
  open,
  onOpenChange,
  quoteNumber,
}: {
  action: QuotePostWinCardProps["cancelAction"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteNumber: string;
}) {
  const router = useProgressRouter();
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    {} as QuoteCancellationActionState,
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    queueMicrotask(() => onOpenChange(false));
    router.refresh();
  }, [onOpenChange, router, state.success]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedReason("");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel accepted work?</DialogTitle>
          <DialogDescription>
            This marks quote {quoteNumber} as canceled after acceptance. The
            quote record stays accepted for historical accuracy.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className={cn("form-stack")}>
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
                  searchable
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
            <DialogClose asChild>
              <Button disabled={isPending} type="button" variant="ghost">
                Back
              </Button>
            </DialogClose>
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
                <>
                  <Ban data-icon="inline-start" />
                  Confirm cancellation
                </>
              )}
            </Button>
          </FormActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
