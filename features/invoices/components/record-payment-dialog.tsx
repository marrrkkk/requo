"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveOverlay, ResponsiveOverlayBody, ResponsiveOverlayContent, ResponsiveOverlayFooter, ResponsiveOverlayHeader, ResponsiveOverlayTitle } from "@/components/ui/responsive-overlay";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import { paymentMethods, type PaymentActionState } from "@/features/invoices/types";
import type { PaymentMethod } from "@/lib/db/schema/invoices";

const labels: Record<PaymentMethod, string> = { cash: "Cash", bank_transfer: "Bank transfer", gcash: "GCash", maya: "Maya", check: "Check", other: "Other" };

export function RecordPaymentDialog({ balanceInCents, currency, action }: { balanceInCents: number; currency: string; action: (state: PaymentActionState, formData: FormData) => Promise<PaymentActionState> }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, pending] = useActionStateWithSonner(action, {});
  useEffect(() => {
    if (state.success) {
      queueMicrotask(() => setOpen(false));
      scheduleRefresh();
    }
  }, [scheduleRefresh, state.success]);
  const defaultDate = new Date().toISOString().slice(0, 10);
  const balanceLabel = new Intl.NumberFormat(undefined, { style: "currency", currency }).format(balanceInCents / 100);

  return (
    <ResponsiveOverlay open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)} disabled={balanceInCents <= 0}><CreditCard data-icon="inline-start" />Record payment</Button>
      <ResponsiveOverlayContent className="sm:max-w-lg">
        <ResponsiveOverlayHeader><ResponsiveOverlayTitle>Record payment</ResponsiveOverlayTitle></ResponsiveOverlayHeader>
        <form action={formAction}>
          <ResponsiveOverlayBody className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Balance due: <span className="font-semibold text-foreground">{balanceLabel}</span></p>
            <div className="grid gap-2"><Label htmlFor="payment-amount">Amount</Label><Input id="payment-amount" name="amount" inputMode="decimal" placeholder="0.00" required aria-invalid={Boolean(state.fieldErrors?.amountInCents)} /></div>
            <div className="grid gap-2"><Label htmlFor="payment-date">Payment date</Label><Input id="payment-date" name="paymentDate" type="date" defaultValue={defaultDate} required /></div>
            <div className="grid gap-2"><Label htmlFor="payment-method">Method</Label><input name="method" type="hidden" value={method} /><Combobox id="payment-method" value={method} onValueChange={(value) => setMethod(value as PaymentMethod)} options={paymentMethods.map((value) => ({ value, label: labels[value] }))} placeholder="Choose method" /></div>
            <div className="grid gap-2"><Label htmlFor="payment-reference">Reference <span className="text-muted-foreground">(optional)</span></Label><Input id="payment-reference" name="reference" /></div>
            <div className="grid gap-2"><Label htmlFor="payment-notes">Notes <span className="text-muted-foreground">(optional)</span></Label><Textarea id="payment-notes" name="notes" rows={3} /></div>
            {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
          </ResponsiveOverlayBody>
          <ResponsiveOverlayFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? (<><Spinner data-icon="inline-start" aria-hidden="true" />Recording...</>) : "Record payment"}</Button></ResponsiveOverlayFooter>
        </form>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
