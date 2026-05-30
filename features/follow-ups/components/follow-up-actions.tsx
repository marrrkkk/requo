"use client";

import { useState } from "react";
import { AlarmClock, CalendarClock, CheckCircle2, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  ResponsiveOverlay,
  ResponsiveOverlayClose,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
  ResponsiveOverlayTrigger,
} from "@/components/ui/responsive-overlay";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  FollowUpCompleteActionState,
  FollowUpRecordActionState,
  FollowUpRescheduleActionState,
  FollowUpSnoozeActionState,
} from "@/features/follow-ups/types";
import { getDateInputValue, getFutureUtcDateString } from "@/features/follow-ups/utils";

type CompleteAction = (
  state: FollowUpCompleteActionState,
  formData: FormData,
) => Promise<FollowUpCompleteActionState>;

type RecordAction = (
  state: FollowUpRecordActionState,
  formData: FormData,
) => Promise<FollowUpRecordActionState>;

type RescheduleAction = (
  state: FollowUpRescheduleActionState,
  formData: FormData,
) => Promise<FollowUpRescheduleActionState>;

type SnoozeAction = (
  state: FollowUpSnoozeActionState,
  formData: FormData,
) => Promise<FollowUpSnoozeActionState>;

export function FollowUpActions({
  completeAction,
  skipAction,
  rescheduleAction,
  snoozeAction,
  dueAt,
  disabled = false,
}: {
  completeAction: CompleteAction;
  skipAction: RecordAction;
  rescheduleAction: RescheduleAction;
  snoozeAction?: SnoozeAction;
  dueAt: Date;
  disabled?: boolean;
}) {
  return (
    <div className="dashboard-actions [&>*]:w-full sm:[&>*]:w-auto">
      <FollowUpCompleteDialog action={completeAction} disabled={disabled} />
      <FollowUpRescheduleDialog
        action={rescheduleAction}
        disabled={disabled}
        dueAt={dueAt}
      />
      {snoozeAction ? (
        <FollowUpSnoozeDialog action={snoozeAction} disabled={disabled} />
      ) : null}
      <FollowUpSkipButton action={skipAction} disabled={disabled} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Complete with optional note
// ---------------------------------------------------------------------------

function FollowUpCompleteDialog({
  action,
  disabled,
}: {
  action: CompleteAction;
  disabled: boolean;
}) {
  const router = useProgressRouter();
  const [open, setOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [_state, formAction, isPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await action(prevState, formData);

      if (nextState.success) {
        setOpen(false);
        setCompletionNote("");
        router.refresh();
      }

      return nextState;
    },
    {} as FollowUpCompleteActionState,
  );

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setCompletionNote("");
        setOpen(nextOpen);
      }}
    >
      <ResponsiveOverlayTrigger asChild>
        <Button disabled={disabled} type="button" variant="default">
          <CheckCircle2 data-icon="inline-start" />
          Mark done
        </Button>
      </ResponsiveOverlayTrigger>
      <ResponsiveOverlayContent className="sm:max-w-md">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>Complete follow-up</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>
            Optionally note what happened (e.g. &ldquo;left voicemail&rdquo;, &ldquo;customer said they&apos;ll decide next week&rdquo;).
          </ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        <form action={formAction}>
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <Field>
              <FieldLabel htmlFor="follow-up-completion-note">
                What happened?
              </FieldLabel>
              <FieldDescription>Optional — leave blank to just mark done.</FieldDescription>
              <FieldContent>
                <Textarea
                  id="follow-up-completion-note"
                  maxLength={500}
                  name="completionNote"
                  onChange={(event) => setCompletionNote(event.currentTarget.value)}
                  placeholder="Left voicemail, will try again Thursday..."
                  rows={2}
                  value={completionNote}
                />
              </FieldContent>
            </Field>
          </div>
          <ResponsiveOverlayFooter>
            <ResponsiveOverlayClose asChild>
              <Button disabled={isPending} type="button" variant="ghost">
                Cancel
              </Button>
            </ResponsiveOverlayClose>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : (
                <CheckCircle2 data-icon="inline-start" />
              )}
              {isPending ? "Completing..." : "Mark done"}
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}

// ---------------------------------------------------------------------------
// Skip button (simple, no dialog)
// ---------------------------------------------------------------------------

function FollowUpSkipButton({
  action,
  disabled,
}: {
  action: RecordAction;
  disabled: boolean;
}) {
  const router = useProgressRouter();
  const [, formAction, isPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await action(prevState, formData);
      if (nextState.success) router.refresh();
      return nextState;
    },
    {} as FollowUpRecordActionState,
  );

  return (
    <form action={formAction}>
      <Button disabled={disabled || isPending} type="submit" variant="ghost">
        {isPending ? (
          <Spinner data-icon="inline-start" aria-hidden="true" />
        ) : (
          <SkipForward data-icon="inline-start" />
        )}
        {isPending ? "Skipping..." : "Skip"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Reschedule dialog
// ---------------------------------------------------------------------------

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
    <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDueDate(getDateInputValue(dueAt));
        }

        setOpen(nextOpen);
      }}
    >
      <ResponsiveOverlayTrigger asChild>
        <Button disabled={disabled} type="button" variant="outline">
          <CalendarClock data-icon="inline-start" />
          Reschedule
        </Button>
      </ResponsiveOverlayTrigger>
      <ResponsiveOverlayContent className="sm:max-w-md">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>Reschedule follow-up</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>
            Pick the next date you want this reminder to show up.
          </ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        <form action={formAction}>
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
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
          <ResponsiveOverlayFooter>
            <ResponsiveOverlayClose asChild>
              <Button disabled={isPending} type="button" variant="ghost">
                Cancel
              </Button>
            </ResponsiveOverlayClose>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : null}
              {isPending ? "Rescheduling..." : "Reschedule"}
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}

// ---------------------------------------------------------------------------
// Snooze dialog
// ---------------------------------------------------------------------------

function FollowUpSnoozeDialog({
  action,
  disabled,
}: {
  action: SnoozeAction;
  disabled: boolean;
}) {
  const router = useProgressRouter();
  const [open, setOpen] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState(getFutureUtcDateString(1));
  const [snoozeTime, setSnoozeTime] = useState("09:00");
  const [state, formAction, isPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await action(prevState, formData);

      if (nextState.success) {
        setOpen(false);
        router.refresh();
      }

      return nextState;
    },
    {} as FollowUpSnoozeActionState,
  );

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setSnoozeDate(getFutureUtcDateString(1));
          setSnoozeTime("09:00");
        }
        setOpen(nextOpen);
      }}
    >
      <ResponsiveOverlayTrigger asChild>
        <Button disabled={disabled} type="button" variant="outline">
          <AlarmClock data-icon="inline-start" />
          Snooze
        </Button>
      </ResponsiveOverlayTrigger>
      <ResponsiveOverlayContent className="sm:max-w-md">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>Snooze follow-up</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>
            Suppress reminders until this time without changing the due date.
          </ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        <form action={formAction}>
          <input
            name="snoozedUntil"
            type="hidden"
            value={`${snoozeDate}T${snoozeTime}:00`}
          />
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(state.fieldErrors?.snoozedUntil?.[0])}>
                <FieldLabel htmlFor="follow-up-snooze-date">Date</FieldLabel>
                <FieldContent>
                  <DatePicker
                    ariaInvalid={Boolean(state.fieldErrors?.snoozedUntil?.[0])}
                    id="follow-up-snooze-date"
                    onChange={setSnoozeDate}
                    required
                    value={snoozeDate}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="follow-up-snooze-time">Time</FieldLabel>
                <FieldContent>
                  <Input
                    id="follow-up-snooze-time"
                    onChange={(event) => setSnoozeTime(event.currentTarget.value)}
                    required
                    type="time"
                    value={snoozeTime}
                  />
                </FieldContent>
              </Field>
            </div>
          </div>
          <ResponsiveOverlayFooter>
            <ResponsiveOverlayClose asChild>
              <Button disabled={isPending} type="button" variant="ghost">
                Cancel
              </Button>
            </ResponsiveOverlayClose>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : (
                <AlarmClock data-icon="inline-start" />
              )}
              {isPending ? "Snoozing..." : "Snooze"}
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
