"use client";

import { useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
} from "@/features/follow-ups/types";
import { followUpChannels } from "@/features/follow-ups/types";
import {
  followUpChannelLabels,
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
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          resetFields();
        }

        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant={triggerVariant}>
          <CalendarPlus data-icon="inline-start" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set follow-up</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <div className="px-6 pb-6">
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
                    rows={4}
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

                <Field data-invalid={Boolean(state.fieldErrors?.dueDate?.[0])}>
                  <FieldLabel htmlFor="follow-up-due-date">Due date</FieldLabel>
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
                </Field>
              </div>

              <Field>
                <FieldLabel>Quick dates</FieldLabel>
                <FieldDescription>
                  Use a common follow-up window or pick a custom date above.
                </FieldDescription>
                <div className="flex flex-wrap gap-2">
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
              </Field>
            </FieldGroup>
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
              ) : (
                <Plus data-icon="inline-start" />
              )}
              {isPending ? "Creating..." : "Create follow-up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
