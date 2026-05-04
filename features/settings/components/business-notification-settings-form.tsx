"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  Inbox,
  MessageSquare,
  Send,
  Smartphone,
  Timer,
  UserCheck,
} from "lucide-react";

import { FormActions } from "@/components/shared/form-layout";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  BusinessNotificationSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";

/* ── Channel definitions ─────────────────────────────────────────────────── */

type Channel = "inApp" | "push";

const channelMeta: Record<Channel, { label: string; icon: React.ElementType }> =
  {
    push: { label: "Push", icon: Smartphone },
    inApp: { label: "In-app", icon: Bell },
  };

const channelOrder: Channel[] = ["push", "inApp"];

/* ── Notification event config ──────────────────────────────────────────── */

type NotificationEventConfig = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  channels: {
    inApp?: string;
    push?: string;
  };
};

type NotificationGroup = {
  label: string;
  events: NotificationEventConfig[];
};

const notificationGroups: NotificationGroup[] = [
  {
    label: "Inquiries",
    events: [
      {
        id: "newInquiry",
        label: "New inquiry received",
        description: "A customer submits an inquiry form.",
        icon: Inbox,
        channels: {
          inApp: "notifyInAppOnNewInquiry",
          push: "notifyPushOnNewInquiry",
        },
      },
      {
        id: "followUpReminder",
        label: "Follow-up reminder",
        description: "An inquiry hasn't had a response in a while.",
        icon: Timer,
        channels: {
          inApp: "notifyInAppOnFollowUpReminder",
        },
      },
    ],
  },
  {
    label: "Quotes",
    events: [
      {
        id: "quoteSent",
        label: "Quote sent",
        description: "A quote is sent to a customer.",
        icon: Send,
        channels: {
          inApp: "notifyInAppOnQuoteSent",
          push: "notifyPushOnQuoteSent",
        },
      },
      {
        id: "quoteResponse",
        label: "Quote response",
        description: "A customer accepts or declines a quote.",
        icon: MessageSquare,
        channels: {
          inApp: "notifyInAppOnQuoteResponse",
          push: "notifyPushOnQuoteResponse",
        },
      },
      {
        id: "quoteExpiring",
        label: "Quote expiring",
        description: "A sent quote is about to expire.",
        icon: Timer,
        channels: {
          inApp: "notifyInAppOnQuoteExpiring",
        },
      },
    ],
  },
  {
    label: "Team",
    events: [
      {
        id: "memberInviteResponse",
        label: "Member invite response",
        description: "A team member accepts or declines an invite.",
        icon: UserCheck,
        channels: {
          inApp: "notifyInAppOnMemberInviteResponse",
          push: "notifyPushOnMemberInviteResponse",
        },
      },
    ],
  },
];

/* ── All field keys ──────────────────────────────────────────────────────── */

type NotificationFieldKey =
  | "notifyInAppOnNewInquiry"
  | "notifyInAppOnQuoteSent"
  | "notifyInAppOnQuoteResponse"
  | "notifyInAppOnMemberInviteResponse"
  | "notifyPushOnNewInquiry"
  | "notifyPushOnQuoteSent"
  | "notifyPushOnQuoteResponse"
  | "notifyPushOnMemberInviteResponse"
  | "notifyInAppOnFollowUpReminder"
  | "notifyInAppOnQuoteExpiring";

const allFieldKeys: NotificationFieldKey[] = [
  "notifyInAppOnNewInquiry",
  "notifyInAppOnQuoteSent",
  "notifyInAppOnQuoteResponse",
  "notifyInAppOnMemberInviteResponse",
  "notifyPushOnNewInquiry",
  "notifyPushOnQuoteSent",
  "notifyPushOnQuoteResponse",
  "notifyPushOnMemberInviteResponse",
  "notifyInAppOnFollowUpReminder",
  "notifyInAppOnQuoteExpiring",
];

/* ── Props ───────────────────────────────────────────────────────────────── */

type BusinessNotificationSettingsFormProps = {
  action: (
    state: BusinessNotificationSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessNotificationSettingsActionState>;
  settings: Pick<BusinessSettingsView, NotificationFieldKey>;
};

const initialState: BusinessNotificationSettingsActionState = {};

/* ── Component ───────────────────────────────────────────────────────────── */

export function BusinessNotificationSettingsForm({
  action,
  settings,
}: BusinessNotificationSettingsFormProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );

  const [values, setValues] = useState<Record<NotificationFieldKey, boolean>>(
    () => {
      const initial = {} as Record<NotificationFieldKey, boolean>;
      for (const key of allFieldKeys) {
        initial[key] = settings[key];
      }
      return initial;
    },
  );

  const hasUnsavedChanges = allFieldKeys.some(
    (key) => values[key] !== settings[key],
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();
  }, [router, state.success]);

  function handleToggle(fieldKey: NotificationFieldKey, nextValue: boolean) {
    setValues((prev) => ({ ...prev, [fieldKey]: nextValue }));
  }

  function handleCancelChanges() {
    const reset = {} as Record<NotificationFieldKey, boolean>;
    for (const key of allFieldKeys) {
      reset[key] = settings[key];
    }
    setValues(reset);
  }

  return (
    <form action={formAction} className="form-stack">
      {/* Hidden inputs for form submission */}
      {allFieldKeys.map((key) => (
        <input
          key={key}
          name={key}
          type="hidden"
          value={values[key] ? "on" : "off"}
        />
      ))}

      <div className="flex flex-col">
        {notificationGroups.map((group, groupIndex) => (
          <section key={group.label}>
            {groupIndex > 0 ? (
              <div className="border-t border-border/60" />
            ) : null}
            <div className="px-1 pb-2 pt-6">
              <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </h3>
            </div>
            <div className="flex flex-col">
              {group.events.map((event) => (
                <NotificationEventRow
                  key={event.id}
                  event={event}
                  values={values}
                  disabled={isPending}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <FormActions>
        <Button
          disabled={isPending || !hasUnsavedChanges}
          onClick={handleCancelChanges}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={isPending || !hasUnsavedChanges} type="submit">
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Saving notifications...
            </>
          ) : (
            "Save notifications"
          )}
        </Button>
      </FormActions>
    </form>
  );
}

/* ── Event Row ───────────────────────────────────────────────────────────── */

function NotificationEventRow({
  event,
  values,
  disabled,
  onToggle,
}: {
  event: NotificationEventConfig;
  values: Record<NotificationFieldKey, boolean>;
  disabled: boolean;
  onToggle: (key: NotificationFieldKey, value: boolean) => void;
}) {
  const availableChannels = channelOrder.filter(
    (ch) => event.channels[ch] !== undefined,
  );
  const enabledChannels = availableChannels.filter((ch) => {
    const key = event.channels[ch];
    return key ? values[key as NotificationFieldKey] : false;
  });

  const summaryLabel =
    enabledChannels.length === 0
      ? "None"
      : enabledChannels.map((ch) => channelMeta[ch].label).join(", ");

  const Icon = event.icon;

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl px-1 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">{event.label}</p>
          <p className="text-[0.8rem] leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        </div>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="shrink-0 gap-1.5 text-muted-foreground"
            disabled={disabled}
            size="sm"
            type="button"
            variant="ghost"
          >
            <span className="text-[0.8rem]">{summaryLabel}</span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 rounded-xl p-2">
          <div className="flex flex-col gap-1">
            {availableChannels.map((ch) => {
              const fieldKey = event.channels[ch] as NotificationFieldKey;
              const meta = channelMeta[ch];
              const ChannelIcon = meta.icon;
              const isChecked = values[fieldKey];

              return (
                <label
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/50"
                  key={ch}
                >
                  <div className="flex items-center gap-2.5">
                    <ChannelIcon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {meta.label}
                    </span>
                  </div>
                  <Switch
                    checked={isChecked}
                    disabled={disabled}
                    onCheckedChange={(next) => onToggle(fieldKey, next)}
                  />
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
