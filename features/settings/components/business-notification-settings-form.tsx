"use client";

import { useEffect, useState } from "react";

import { FormActions } from "@/components/shared/form-layout";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  BusinessNotificationSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";

type BusinessNotificationSettingsFormProps = {
  action: (
    state: BusinessNotificationSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessNotificationSettingsActionState>;
  settings: Pick<
    BusinessSettingsView,
    | "notifyOnNewInquiry"
    | "notifyOnQuoteSent"
    | "notifyOnQuoteResponse"
    | "notifyInAppOnNewInquiry"
    | "notifyInAppOnQuoteResponse"
  >;
};

const initialState: BusinessNotificationSettingsActionState = {};

export function BusinessNotificationSettingsForm({
  action,
  settings,
}: BusinessNotificationSettingsFormProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [notifyOnNewInquiry, setNotifyOnNewInquiry] = useState(
    settings.notifyOnNewInquiry,
  );
  const [notifyOnQuoteSent, setNotifyOnQuoteSent] = useState(
    settings.notifyOnQuoteSent,
  );
  const [notifyOnQuoteResponse, setNotifyOnQuoteResponse] = useState(
    settings.notifyOnQuoteResponse,
  );
  const [notifyInAppOnNewInquiry, setNotifyInAppOnNewInquiry] = useState(
    settings.notifyInAppOnNewInquiry,
  );
  const [notifyInAppOnQuoteResponse, setNotifyInAppOnQuoteResponse] = useState(
    settings.notifyInAppOnQuoteResponse,
  );
  const hasUnsavedChanges =
    notifyOnNewInquiry !== settings.notifyOnNewInquiry ||
    notifyOnQuoteSent !== settings.notifyOnQuoteSent ||
    notifyOnQuoteResponse !== settings.notifyOnQuoteResponse ||
    notifyInAppOnNewInquiry !== settings.notifyInAppOnNewInquiry ||
    notifyInAppOnQuoteResponse !== settings.notifyInAppOnQuoteResponse;

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();
  }, [router, state.success]);

  function handleCancelChanges() {
    setNotifyOnNewInquiry(settings.notifyOnNewInquiry);
    setNotifyOnQuoteSent(settings.notifyOnQuoteSent);
    setNotifyOnQuoteResponse(settings.notifyOnQuoteResponse);
    setNotifyInAppOnNewInquiry(settings.notifyInAppOnNewInquiry);
    setNotifyInAppOnQuoteResponse(settings.notifyInAppOnQuoteResponse);
  }

  return (
    <form action={formAction} className="form-stack">
      <input
        name="notifyOnNewInquiry"
        type="hidden"
        value={String(notifyOnNewInquiry)}
      />
      <input
        name="notifyOnQuoteSent"
        type="hidden"
        value={String(notifyOnQuoteSent)}
      />
      <input
        name="notifyOnQuoteResponse"
        type="hidden"
        value={String(notifyOnQuoteResponse)}
      />
      <input
        name="notifyInAppOnNewInquiry"
        type="hidden"
        value={String(notifyInAppOnNewInquiry)}
      />
      <input
        name="notifyInAppOnQuoteResponse"
        type="hidden"
        value={String(notifyInAppOnQuoteResponse)}
      />

      <section className="section-panel p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              In dashboard
            </h2>
            <p className="text-sm text-muted-foreground">Alerts inside Requo.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/15">
            <NotificationSettingRow
              checked={notifyInAppOnNewInquiry}
              description="Show an alert when a new inquiry arrives."
              disabled={isPending}
              label="New inquiries"
              onCheckedChange={setNotifyInAppOnNewInquiry}
            />
            <NotificationSettingRow
              checked={notifyInAppOnQuoteResponse}
              description="Show an alert when a quote is accepted or declined."
              disabled={isPending}
              label="Quote responses"
              onCheckedChange={setNotifyInAppOnQuoteResponse}
            />
          </div>
        </div>
      </section>

      <section className="section-panel p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Email notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Messages sent to the owner.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/15">
            <NotificationSettingRow
              checked={notifyOnNewInquiry}
              description="Email the owner when a new inquiry arrives."
              disabled={isPending}
              label="New inquiries"
              onCheckedChange={setNotifyOnNewInquiry}
            />
            <NotificationSettingRow
              checked={notifyOnQuoteSent}
              description="Email the owner after a quote is sent."
              disabled={isPending}
              label="Quote sent"
              onCheckedChange={setNotifyOnQuoteSent}
            />
            <NotificationSettingRow
              checked={notifyOnQuoteResponse}
              description="Email the owner when a quote is accepted or declined."
              disabled={isPending}
              label="Quote responses"
              onCheckedChange={setNotifyOnQuoteResponse}
            />
          </div>
        </div>
      </section>

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

function NotificationSettingRow({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  onCheckedChange: (nextValue: boolean) => void;
}) {
  return (
    <label className="grid gap-4 border-b border-border/70 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
}
