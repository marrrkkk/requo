"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, SkipForward } from "lucide-react";

import { ServerActionButton } from "@/components/shared/server-action-button";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  FollowUpRecordActionState,
  FollowUpRescheduleActionState,
} from "@/features/follow-ups/types";
import { getDateInputValue } from "@/features/follow-ups/utils";

type RecordAction = (
  state: FollowUpRecordActionState,
  formData: FormData,
) => Promise<FollowUpRecordActionState>;

type RescheduleAction = (
  state: FollowUpRescheduleActionState,
  formData: FormData,
) => Promise<FollowUpRescheduleActionState>;

export function FollowUpActions({
  completeAction,
  skipAction,
  rescheduleAction,
  dueAt,
  disabled = false,
}: {
  completeAction: RecordAction;
  skipAction: RecordAction;
  rescheduleAction: RescheduleAction;
  dueAt: Date;
  disabled?: boolean;
}) {
  return (
    <div className="dashboard-actions [&>*]:w-full sm:[&>*]:w-auto">
      <ServerActionButton
        action={completeAction}
        disabled={disabled}
        icon={CheckCircle2}
        label="Mark done"
        pendingLabel="Marking done..."
        variant="outline"
      />
      <FollowUpRescheduleDialog
        action={rescheduleAction}
        disabled={disabled}
        dueAt={dueAt}
      />
      <ServerActionButton
        action={skipAction}
        disabled={disabled}
        icon={SkipForward}
        label="Skip"
        pendingLabel="Skipping..."
        variant="ghost"
      />
    </div>
  );
}

function FollowUpRescheduleDialog({
  action,
  disabled,
  dueAt,
}: {
  action: RescheduleAction;
  disabled: boolean;
  dueAt: Date;
}) {
  const router = useProgressRouter();
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState(getDateInputValue(dueAt));
  const [state, formAction, isPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await action(prevState, formData);

      if (nextState.success) {
        setOpen(false);
        router.refresh();
      }

      return nextState;
    },
    {} as FollowUpRescheduleActionState,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDueDate(getDateInputValue(dueAt));
        }

        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled} type="button" variant="outline">
          <CalendarClock data-icon="inline-start" />
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule follow-up</DialogTitle>
          <DialogDescription>
            Pick the next date you want this reminder to show up.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <div className="px-6 pb-6">
            <Field data-invalid={Boolean(state.fieldErrors?.dueDate?.[0])}>
              <FieldLabel htmlFor="follow-up-reschedule-date">Due date</FieldLabel>
              <FieldContent>
                <DatePicker
                  ariaInvalid={Boolean(state.fieldErrors?.dueDate?.[0])}
                  id="follow-up-reschedule-date"
                  name="dueDate"
                  onChange={setDueDate}
                  required
                  value={dueDate}
                />
              </FieldContent>
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isPending} type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : null}
              {isPending ? "Rescheduling..." : "Reschedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
