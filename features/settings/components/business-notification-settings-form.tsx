"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  getExistingPushSubscription,
  getPushPermission,
  isPushConfiguredForClient,
  isPushSupported,
  removePushSubscription,
  savePushSubscription,
  subscribeToPush,
} from "@/features/notifications/push-client";
import type {
  BusinessNotificationSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";

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

const pushFieldKeys = [
  "notifyPushOnNewInquiry",
  "notifyPushOnQuoteSent",
  "notifyPushOnQuoteResponse",
  "notifyPushOnMemberInviteResponse",
] satisfies NotificationFieldKey[];

type PushSetupState =
  | "checking"
  | "ready"
  | "needs-enable"
  | "unsupported"
  | "blocked"
  | "not-configured";

function isPushFieldKey(
  fieldKey: NotificationFieldKey,
): fieldKey is (typeof pushFieldKeys)[number] {
  return (pushFieldKeys as readonly NotificationFieldKey[]).includes(fieldKey);
}

/* ── Props ───────────────────────────────────────────────────────────────── */

type BusinessNotificationSettingsFormProps = {
  action: (
    state: BusinessNotificationSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessNotificationSettingsActionState>;
  sendTestPushAction?: () => Promise<{ success?: string; error?: string }>;
  businessId: string;
  settings: Pick<BusinessSettingsView, NotificationFieldKey>;
};

/* ── Component ───────────────────────────────────────────────────────────── */

export function BusinessNotificationSettingsForm({
  action,
  sendTestPushAction,
  businessId,
  settings,
}: BusinessNotificationSettingsFormProps) {
  const [values, setValues] = useState<Record<NotificationFieldKey, boolean>>(
    () => {
      const initial = {} as Record<NotificationFieldKey, boolean>;
      for (const key of allFieldKeys) {
        initial[key] = settings[key];
      }
      return initial;
    },
  );
  const [pushSetupState, setPushSetupState] =
    useState<PushSetupState>("checking");
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);
  const [isEnablingBrowserPush, setIsEnablingBrowserPush] = useState(false);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
  const [_isSaving, startTransition] = useTransition();
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const selectedPushCount = pushFieldKeys.filter((key) => values[key]).length;

  const removePushForBusiness = useCallback(
    async (endpoint?: string | null) => {
      const existingEndpoint =
        endpoint ??
        pushEndpoint ??
        (await getExistingPushSubscription())?.endpoint;

      if (!existingEndpoint) {
        return;
      }

      await removePushSubscription(existingEndpoint, businessId);
    },
    [businessId, pushEndpoint],
  );

  const refreshPushSetupState = useCallback(async () => {
    if (!isPushConfiguredForClient()) {
      setPushSetupState("not-configured");
      setPushEndpoint(null);
      return;
    }

    if (!isPushSupported()) {
      setPushSetupState("unsupported");
      setPushEndpoint(null);
      return;
    }

    const permission = getPushPermission();

    if (permission === "denied") {
      setPushSetupState("blocked");
      setPushEndpoint(null);
      return;
    }

    if (permission !== "granted") {
      setPushSetupState("needs-enable");
      setPushEndpoint(null);
      return;
    }

    const subscription = await getExistingPushSubscription();

    if (!subscription) {
      setPushSetupState("needs-enable");
      setPushEndpoint(null);
      return;
    }

    if (selectedPushCount > 0) {
      const saved = await savePushSubscription(subscription, businessId);

      if (!saved) {
        setPushSetupState("needs-enable");
        setPushEndpoint(null);
        return;
      }
    }

    setPushEndpoint(subscription.endpoint);
    setPushSetupState("ready");
  }, [businessId, selectedPushCount]);

  useEffect(() => {
    let isCancelled = false;

    async function refresh() {
      await refreshPushSetupState();
      if (isCancelled) return;
    }

    void refresh();
    return () => { isCancelled = true; };
  }, [refreshPushSetupState]);

  // Auto-save: submit current values to server action
  function saveValues(nextValues: Record<NotificationFieldKey, boolean>) {
    startTransition(async () => {
      const formData = new FormData();
      for (const key of allFieldKeys) {
        formData.set(key, nextValues[key] ? "on" : "off");
      }

      const result = await action({}, formData);

      if (result.error) {
        toast.error(result.error);
      }

      // If all push disabled, clean up subscription
      const nextPushCount = pushFieldKeys.filter((k) => nextValues[k]).length;
      if (nextPushCount === 0) {
        void removePushForBusiness();
      }
    });
  }

  async function enablePushForBrowser(): Promise<boolean> {
    if (!isPushConfiguredForClient()) {
      setPushSetupState("not-configured");
      toast.error("Push notifications are not configured for this environment.");
      return false;
    }

    if (!isPushSupported()) {
      setPushSetupState("unsupported");
      toast.error("This browser does not support push notifications.");
      return false;
    }

    const currentPermission = getPushPermission();

    if (currentPermission === "denied") {
      setPushSetupState("blocked");
      toast.error("Browser notifications are blocked. Allow them in browser settings first.");
      return false;
    }

    setIsEnablingBrowserPush(true);

    try {
      const subscription = await subscribeToPush();

      if (!subscription) {
        setPushSetupState("needs-enable");
        toast.error(
          currentPermission === "default"
            ? "Notification permission was not granted."
            : "Could not create a push subscription. Try refreshing the page.",
        );
        return false;
      }

      const saved = await savePushSubscription(subscription, businessId);

      if (!saved) {
        setPushSetupState("needs-enable");
        toast.error("We could not save this browser for push notifications.");
        return false;
      }

      setPushEndpoint(subscription.endpoint);
      setPushSetupState("ready");
      if (currentPermission === "default") {
        toast.success("Push notifications enabled for this browser.");
      }
      return true;
    } finally {
      setIsEnablingBrowserPush(false);
    }
  }

  async function handleToggle(
    fieldKey: NotificationFieldKey,
    nextValue: boolean,
  ) {
    // For push fields being enabled, always ensure a fresh subscription
    if (isPushFieldKey(fieldKey) && nextValue) {
      const enabled = await enablePushForBrowser();
      if (!enabled) return;
    }

    const nextValues = { ...valuesRef.current, [fieldKey]: nextValue };
    setValues(nextValues);
    saveValues(nextValues);
  }

  async function handleSendTestPush() {
    if (!sendTestPushAction) return;

    setIsSendingTestPush(true);

    try {
      const result = await sendTestPushAction();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success) {
        toast.success(result.success);
      }
    } catch {
      toast.error("We couldn't send the test notification right now.");
    } finally {
      setIsSendingTestPush(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PushBrowserStatus
        busy={isEnablingBrowserPush}
        isSendingTest={isSendingTestPush}
        selectedPushCount={selectedPushCount}
        setupState={pushSetupState}
        onEnable={() => { void enablePushForBrowser(); }}
        onSendTest={() => { void handleSendTestPush(); }}
      />

      <section className="section-panel">
        {notificationGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 ? (
              <div className="border-t border-border/60" />
            ) : null}
            <div className="px-5 pb-1 pt-5 sm:px-6">
              <h3 className="meta-label">{group.label}</h3>
            </div>
            <div className="flex flex-col">
              {group.events.map((event) => (
                <NotificationEventRow
                  key={event.id}
                  event={event}
                  values={values}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ── Event Row ───────────────────────────────────────────────────────────── */

type Channel = "inApp" | "push";

const channelMeta: Record<Channel, { label: string; icon: React.ElementType }> = {
  inApp: { label: "In-app", icon: Bell },
  push: { label: "Push", icon: Smartphone },
};

const channelOrder: Channel[] = ["push", "inApp"];

function NotificationEventRow({
  event,
  values,
  onToggle,
}: {
  event: NotificationEventConfig;
  values: Record<NotificationFieldKey, boolean>;
  onToggle: (key: NotificationFieldKey, value: boolean) => void | Promise<void>;
}) {
  const Icon = event.icon;

  const availableChannels = channelOrder.filter(
    (ch) => event.channels[ch] !== undefined,
  );
  const enabledChannels = availableChannels.filter((ch) => {
    const key = event.channels[ch];
    return key ? values[key as NotificationFieldKey] : false;
  });

  const summaryLabel =
    enabledChannels.length === 0
      ? "Off"
      : enabledChannels.map((ch) => channelMeta[ch].label).join(", ");

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
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
                    onCheckedChange={(next) => onToggle(fieldKey, next)}
                    aria-label={`${event.label} ${meta.label.toLowerCase()}`}
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

/* ── Push Status Banner ──────────────────────────────────────────────────── */

function PushBrowserStatus({
  busy,
  isSendingTest,
  selectedPushCount,
  setupState,
  onEnable,
  onSendTest,
}: {
  busy: boolean;
  isSendingTest: boolean;
  selectedPushCount: number;
  setupState: PushSetupState;
  onEnable: () => void;
  onSendTest: () => void;
}) {
  if (selectedPushCount === 0) {
    return null;
  }

  if (setupState === "ready") {
    return (
      <Alert role="status">
        <Smartphone />
        <AlertTitle>Push is enabled on this browser</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Send a test notification to confirm this browser receives pushes.
          </span>
          <Button
            className="w-fit"
            disabled={isSendingTest}
            onClick={onSendTest}
            size="sm"
            type="button"
            variant="outline"
          >
            {isSendingTest ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Sending...
              </>
            ) : (
              "Send test notification"
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const statusContent = getPushStatusContent(setupState);
  const canEnable = setupState === "needs-enable";

  return (
    <Alert role="status">
      <Smartphone />
      <AlertTitle>{statusContent.title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{statusContent.description}</span>
        {canEnable ? (
          <Button
            className="w-fit"
            disabled={busy}
            onClick={onEnable}
            size="sm"
            type="button"
            variant="outline"
          >
            {busy ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Enabling...
              </>
            ) : (
              "Enable this browser"
            )}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function getPushStatusContent(setupState: PushSetupState) {
  switch (setupState) {
    case "blocked":
      return {
        title: "Push is blocked in this browser",
        description:
          "Allow notifications in your browser settings before enabling push here.",
      };
    case "not-configured":
      return {
        title: "Push delivery is not configured",
        description:
          "Add VAPID keys to this environment before saving push channels.",
      };
    case "unsupported":
      return {
        title: "Push is unavailable in this browser",
        description:
          "Use a browser with service worker and notification support for push alerts.",
      };
    case "checking":
      return {
        title: "Checking browser push",
        description: "Confirming this browser can receive push notifications.",
      };
    case "needs-enable":
    case "ready":
      return {
        title: "Enable push on this browser",
        description:
          "This browser needs notification permission before it can receive push alerts.",
      };
  }
}
