"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  FollowUpChannel,
  FollowUpEditActionState,
  FollowUpRecurrence,
  FollowUpView,
} from "@/features/follow-ups/types";
import { followUpChannels, followUpRecurrences } from "@/features/follow-ups/types";
import {
  followUpChannelLabels,
  followUpRecurrenceLabels,
  getDateInputValue,
} from "@/features/follow-ups/utils";

type FollowUpEditAction = (
  state: FollowUpEditActionState,
  formData: FormData,
) => Promise<FollowUpEditActionState>;

const channelOptions = followUpChannels.map((channel) => ({
  label: followUpChannelLabels[channel],
  value: channel,
}));

const recurrenceOptions = followUpRecurrences.map((r) => ({
  label: followUpRecurrenceLabels[r],
  value: r,
}));

export function FollowUpEditDialog({
  action,
  followUp,
  disabled = false,
}: {
  action: FollowUpEditAction;
  followUp: FollowUpView;
  disabled?: boolean;
}) {
  const router = useProgressRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(followUp.title);
  const [reason, setReason] = useState(followUp.reason);
  const [channel, setChannel] = useState<FollowUpChannel>(followUp.channel);
  const [dueDate, setDueDate] = useState(getDateInputValue(followUp.dueAt));
  const [recurrence, setRecurrence] = useState<FollowUpRecurrence>(followUp.recurrence);
  const [recurrenceLimit, setRecurrenceLimit] = useState(
    followUp.recurrenceLimit?.toString() ?? "",
  );
  const [state, formAction, isPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await action(prevState, formData);

      if (nextState.success) {
        setOpen(false);
        router.refresh();
      }

      return nextState;
    },
    {} as FollowUpEditActionState,
  );

  function resetFields() {
    setTitle(followUp.title);
    setReason(followUp.reason);
    setChannel(followUp.channel);
    setDueDate(getDateInputValue(followUp.dueAt));
    setRecurrence(followUp.recurrence);
    setRecurrenceLimit(followUp.recurrenceLimit?.toString() ?? "");
  }

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          resetFields();
        }

        setOpen(nextOpen);
      }}
    >
      <ResponsiveOverlayTrigger asChild>
        <Button disabled={disabled} size="sm" type="button" variant="ghost">
          <Pencil data-icon="inline-start" />
          Edit
        </Button>
      </ResponsiveOverlayTrigger>
      <ResponsiveOverlayContent className="sm:max-w-lg">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>Edit follow-up</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>
            Update this follow-up&apos;s details. Only pending follow-ups can be edited.
          </ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        <form action={formAction}>
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <FieldGroup>
              <Field data-invalid={Boolean(state.fieldErrors?.title?.[0])}>
                <FieldLabel htmlFor="edit-follow-up-title">Title</FieldLabel>
                <FieldContent>
                  <Input
                    aria-invalid={Boolean(state.fieldErrors?.title?.[0])}
                    id="edit-follow-up-title"
                    maxLength={160}
                    name="title"
                    onChange={(event) => setTitle(event.currentTarget.value)}
                    required
                    value={title}
                  />
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(state.fieldErrors?.reason?.[0])}>
                <FieldLabel htmlFor="edit-follow-up-reason">Reason</FieldLabel>
                <FieldContent>
                  <Textarea
                    aria-invalid={Boolean(state.fieldErrors?.reason?.[0])}
                    id="edit-follow-up-reason"
                    maxLength={500}
                    name="reason"
                    onChange={(event) => setReason(event.currentTarget.value)}
                    required
                    rows={3}
                    value={reason}
                  />
                </FieldContent>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(state.fieldErrors?.channel?.[0])}>
                  <FieldLabel htmlFor="edit-follow-up-channel">Channel</FieldLabel>
                  <FieldContent>
                    <input name="channel" type="hidden" value={channel} />
                    <Combobox
                      aria-invalid={Boolean(state.fieldErrors?.channel?.[0])}
                      id="edit-follow-up-channel"
                      onValueChange={(value) => setChannel(value as FollowUpChannel)}
                      options={channelOptions}
                      placeholder="Choose channel"
                      value={channel}
                    />
                  </FieldContent>
                </Field>

                <Field data-invalid={Boolean(state.fieldErrors?.dueDate?.[0])}>
                  <FieldLabel htmlFor="edit-follow-up-due-date">Due date</FieldLabel>
                  <FieldContent>
                    <DatePicker
                      ariaInvalid={Boolean(state.fieldErrors?.dueDate?.[0])}
                      id="edit-follow-up-due-date"
                      name="dueDate"
                      onChange={setDueDate}
                      required
                      value={dueDate}
                    />
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(state.fieldErrors?.recurrence?.[0])}>
                  <FieldLabel htmlFor="edit-follow-up-recurrence">Repeat</FieldLabel>
                  <FieldContent>
                    <input name="recurrence" type="hidden" value={recurrence} />
                    <Combobox
                      aria-invalid={Boolean(state.fieldErrors?.recurrence?.[0])}
                      id="edit-follow-up-recurrence"
                      onValueChange={(value) => setRecurrence(value as FollowUpRecurrence)}
                      options={recurrenceOptions}
                      placeholder="No repeat"
                      value={recurrence}
                    />
                  </FieldContent>
                </Field>

                {recurrence !== "none" && (
                  <Field data-invalid={Boolean(state.fieldErrors?.recurrenceLimit?.[0])}>
                    <FieldLabel htmlFor="edit-follow-up-recurrence-limit">
                      Max repeats
                    </FieldLabel>
                    <FieldDescription>Leave blank for unlimited.</FieldDescription>
                    <FieldContent>
                      <Input
                        aria-invalid={Boolean(state.fieldErrors?.recurrenceLimit?.[0])}
                        id="edit-follow-up-recurrence-limit"
                        max={100}
                        min={1}
                        name="recurrenceLimit"
                        onChange={(event) => setRecurrenceLimit(event.currentTarget.value)}
                        placeholder="Unlimited"
                        type="number"
                        value={recurrenceLimit}
                      />
                    </FieldContent>
                  </Field>
                )}
              </div>
            </FieldGroup>
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
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
