"use client";

import { useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  ResponsiveOverlay,
  ResponsiveOverlayBody,
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
  FollowUpCreateActionState,
  FollowUpRecurrence,
} from "@/features/follow-ups/types";
import { followUpChannels, followUpRecurrences } from "@/features/follow-ups/types";
import {
  followUpChannelLabels,
  followUpRecurrenceLabels,
  getQuickFollowUpDueDate,
} from "@/features/follow-ups/utils";

type FollowUpCreateAction = (
  state: FollowUpCreateActionState,
  formData: FormData,
) => Promise<FollowUpCreateActionState>;

const channelOptions = followUpChannels.map((channel) => ({
  label: followUpChannelLabels[channel],
  value: channel,
}));

const recurrenceOptions = followUpRecurrences.map((r) => ({
  label: followUpRecurrenceLabels[r],
  value: r,
}));

export function FollowUpCreateDialog({
  action,
  defaultChannel = "email",
  defaultDueDate = getQuickFollowUpDueDate("3d"),
  defaultReason,
  defaultTitle,
  description = "Set a simple reminder for the next customer touchpoint.",
  triggerLabel = "Set follow-up",
  triggerVariant = "outline",
}: {
  action: FollowUpCreateAction;
  defaultChannel?: FollowUpChannel;
  defaultDueDate?: string;
  defaultReason: string;
  defaultTitle: string;
  description?: string;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const router = useProgressRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [reason, setReason] = useState(defaultReason);
  const [channel, setChannel] = useState<FollowUpChannel>(defaultChannel);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [recurrence, setRecurrence] = useState<FollowUpRecurrence>("none");
  const [recurrenceLimit, setRecurrenceLimit] = useState("");
  const [state, formAction, isPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await action(prevState, formData);

      if (nextState.success) {
        setOpen(false);
        router.refresh();
      }

      return nextState;
    },
    {} as FollowUpCreateActionState,
  );

  function resetFields() {
    setTitle(defaultTitle);
    setReason(defaultReason);
    setChannel(defaultChannel);
    setDueDate(defaultDueDate);
    setRecurrence("none");
    setRecurrenceLimit("");
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
        <Button type="button" variant={triggerVariant}>
          <CalendarPlus data-icon="inline-start" />
          {triggerLabel}
        </Button>
      </ResponsiveOverlayTrigger>
      <ResponsiveOverlayContent className="sm:max-w-xl">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>Set follow-up</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>{description}</ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        <form action={formAction}>
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <FieldGroup>
              <Field data-invalid={Boolean(state.fieldErrors?.title?.[0])}>
                <FieldLabel htmlFor="follow-up-title">Title</FieldLabel>
                <FieldContent>
                  <Input
                    aria-invalid={Boolean(state.fieldErrors?.title?.[0])}
                    id="follow-up-title"
                    maxLength={160}
                    name="title"
                    onChange={(event) => setTitle(event.currentTarget.value)}
                    required
                    value={title}
                  />
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(state.fieldErrors?.reason?.[0])}>
                <FieldLabel htmlFor="follow-up-reason">Reason</FieldLabel>
                <FieldContent>
                  <Textarea
                    aria-invalid={Boolean(state.fieldErrors?.reason?.[0])}
                    id="follow-up-reason"
                    maxLength={500}
                    name="reason"
                    onChange={(event) => setReason(event.currentTarget.value)}
                    required
                    rows={2}
                    value={reason}
                  />
                </FieldContent>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(state.fieldErrors?.channel?.[0])}>
                  <FieldLabel htmlFor="follow-up-channel">Channel</FieldLabel>
                  <FieldContent>
                    <input name="channel" type="hidden" value={channel} />
                    <Combobox
                      aria-invalid={Boolean(state.fieldErrors?.channel?.[0])}
                      id="follow-up-channel"
                      onValueChange={(value) => setChannel(value as FollowUpChannel)}
                      options={channelOptions}
                      placeholder="Choose channel"
                      value={channel}
                    />
                  </FieldContent>
                </Field>

                <Field data-invalid={Boolean(state.fieldErrors?.recurrence?.[0])}>
                  <FieldLabel htmlFor="follow-up-recurrence">Repeat</FieldLabel>
                  <FieldContent>
                    <input name="recurrence" type="hidden" value={recurrence} />
                    <Combobox
                      aria-invalid={Boolean(state.fieldErrors?.recurrence?.[0])}
                      id="follow-up-recurrence"
                      onValueChange={(value) => setRecurrence(value as FollowUpRecurrence)}
                      options={recurrenceOptions}
                      placeholder="No repeat"
                      value={recurrence}
                    />
                  </FieldContent>
                </Field>
              </div>

              {recurrence !== "none" && (
                <Field data-invalid={Boolean(state.fieldErrors?.recurrenceLimit?.[0])}>
                  <FieldLabel htmlFor="follow-up-recurrence-limit">
                    Max repeats
                  </FieldLabel>
                  <FieldDescription>Leave blank for unlimited.</FieldDescription>
                  <FieldContent>
                    <Input
                      aria-invalid={Boolean(state.fieldErrors?.recurrenceLimit?.[0])}
                      id="follow-up-recurrence-limit"
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

              <Field data-invalid={Boolean(state.fieldErrors?.dueDate?.[0])}>
                <FieldLabel htmlFor="follow-up-due-date">Due date</FieldLabel>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-full sm:w-56">
                    <FieldContent>
                      <DatePicker
                        ariaInvalid={Boolean(state.fieldErrors?.dueDate?.[0])}
                        id="follow-up-due-date"
                        name="dueDate"
                        onChange={setDueDate}
                        required
                        value={dueDate}
                      />
                    </FieldContent>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => setDueDate(getQuickFollowUpDueDate("tomorrow"))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Tomorrow
                    </Button>
                    <Button
                      onClick={() => setDueDate(getQuickFollowUpDueDate("3d"))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      In 3 days
                    </Button>
                    <Button
                      onClick={() => setDueDate(getQuickFollowUpDueDate("7d"))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      In 7 days
                    </Button>
                  </div>
                </div>
              </Field>
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
              ) : (
                <Plus data-icon="inline-start" />
              )}
              {isPending ? "Creating..." : "Create follow-up"}
            </Button>
          </ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
