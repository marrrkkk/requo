"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import type {
  ProviderConnectionActionState,
  ProviderPaymentActionState,
} from "@/features/payment-providers/actions";
import type { ProviderConnectionView } from "@/features/payment-providers/queries";

export function CreatePaymentLinkForm({
  action,
  connections,
  balanceInCents,
  currency,
}: {
  action: (state: ProviderPaymentActionState, formData: FormData) => Promise<ProviderPaymentActionState>;
  connections: ProviderConnectionView[];
  balanceInCents: number;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, pending] = useActionStateWithSonner(action, {});
  const defaultAmount = (balanceInCents / 100).toFixed(2);

  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
    } else if (state.success) {
      queueMicrotask(() => setOpen(false));
      scheduleRefresh();
    }
  }, [scheduleRefresh, state.checkoutUrl, state.success]);

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={balanceInCents <= 0}>
        Create payment link
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 rounded-lg border p-4">
      <div className="grid gap-2">
        <Label htmlFor="provider-connection">Provider</Label>
        <select
          id="provider-connection"
          name="connectionId"
          className="rounded border border-input bg-background px-2 py-1.5 text-sm"
          defaultValue={connections[0]?.id ?? ""}
          required
        >
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.provider === "paymongo" ? "PayMongo" : c.provider === "stripe" ? "Stripe" : c.provider === "paypal" ? "PayPal" : c.provider} · {c.environment} · {c.publicHint ?? ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="provider-amount">Amount ({currency})</Label>
        <Input id="provider-amount" name="amount" inputMode="decimal" defaultValue={defaultAmount} required />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Creating...
            </>
          ) : (
            "Continue to provider checkout"
          )}
        </Button>
      </div>
    </form>
  );
}

export function RefundProviderPaymentForm({
  action,
  maxInCents,
  currency,
}: {
  action: (state: ProviderPaymentActionState, formData: FormData) => Promise<ProviderPaymentActionState>;
  maxInCents: number;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, pending] = useActionStateWithSonner(action, {});

  useEffect(() => {
    if (state.success) {
      queueMicrotask(() => setOpen(false));
      scheduleRefresh();
    }
  }, [scheduleRefresh, state.success]);

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Refund
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-end gap-2">
      <div className="grid gap-1">
        <Label htmlFor={`refund-amount-${currency}`}>Amount ({currency})</Label>
        <Input
          id={`refund-amount-${currency}`}
          name="amount"
          inputMode="decimal"
          defaultValue={(maxInCents / 100).toFixed(2)}
          required
        />
      </div>
      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Spinner data-icon="inline-start" aria-hidden="true" />
            Submitting...
          </>
        ) : (
          "Submit refund"
        )}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function RefreshProviderPaymentButton({
  action,
}: {
  action: (state: ProviderConnectionActionState, formData: FormData) => Promise<ProviderConnectionActionState>;
}) {
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, pending] = useActionStateWithSonner(action, {});

  useEffect(() => {
    if (state.success) scheduleRefresh();
  }, [scheduleRefresh, state.success]);

  return (
    <form action={formAction} className="inline">
      <Button type="submit" variant="ghost" disabled={pending}>
        {pending ? "Refreshing..." : "Refresh"}
      </Button>
      {state.error ? (
        <span role="alert" className="ml-2 text-sm text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
