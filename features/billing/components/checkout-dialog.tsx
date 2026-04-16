"use client";

/**
 * Checkout dialog for selecting a plan and payment method.
 *
 * - Shows plan cards with localized pricing
 * - QRPh inline flow for PHP (renders QR code)
 * - Lemon Squeezy redirect flow for USD (opens hosted checkout)
 */

import {
  useActionState,
  useEffect,
  useState,
} from "react";
import { ArrowRight, CreditCard, QrCode, Check } from "lucide-react";
import QRCode from "react-qr-code";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { createCheckoutAction } from "@/features/billing/actions";
import type { CheckoutActionState } from "@/features/billing/types";
import type { WorkspacePlan } from "@/lib/plans/plans";
import type { BillingCurrency, BillingRegion, PaidPlan } from "@/lib/billing/types";
import { getPlanPriceLabel, formatPrice } from "@/lib/billing/plans";
import { planMeta } from "@/lib/plans";
import { cn } from "@/lib/utils";

type CheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceSlug: string;
  currentPlan: WorkspacePlan;
  targetPlan?: PaidPlan;
  region: BillingRegion;
  defaultCurrency: BillingCurrency;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  workspaceId,
  currentPlan,
  targetPlan,
  defaultCurrency,
}: CheckoutDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>(
    targetPlan ?? (currentPlan === "pro" ? "business" : "pro"),
  );
  const [currency, setCurrency] = useState<BillingCurrency>(defaultCurrency);
  const [state, formAction, isPending] = useActionState(
    createCheckoutAction,
    {} as CheckoutActionState,
  );

  // Handle redirect to Lemon Squeezy
  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
    }
  }, [state.checkoutUrl]);

  const isQrPh = currency === "PHP";
  const showQrCode = state.qrData && isQrPh;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {showQrCode ? "Scan to pay" : "Upgrade your workspace"}
          </DialogTitle>
          <DialogDescription>
            {showQrCode
              ? "Scan the QR code with your banking app to complete payment."
              : "Choose a plan and payment method to unlock premium features."}
          </DialogDescription>
        </DialogHeader>

        {showQrCode ? (
          <QrPhPaymentView
            qrData={state.qrData!}
            plan={selectedPlan}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <div className="grid gap-5 pt-1">
            {/* Plan selection */}
            <div className="grid gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Select plan
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["pro", "business"] as const)
                  .filter((p) => p !== currentPlan)
                  .map((plan) => (
                    <button
                      className={cn(
                        "flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors",
                        selectedPlan === plan
                          ? "border-primary/40 bg-accent/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                          : "border-border/70 bg-card/60 hover:bg-accent/10",
                      )}
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {planMeta[plan].label}
                        </p>
                        {selectedPlan === plan ? (
                          <Check className="size-4 text-primary" />
                        ) : null}
                      </div>
                      <p className="font-heading text-lg font-semibold tracking-tight text-foreground">
                        {getPlanPriceLabel(plan, currency)}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {planMeta[plan].description}
                      </p>
                    </button>
                  ))}
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Payment method */}
            <div className="grid gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Payment method
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                    currency === "PHP"
                      ? "border-primary/40 bg-accent/30"
                      : "border-border/70 bg-card/60 hover:bg-accent/10",
                  )}
                  onClick={() => setCurrency("PHP")}
                  type="button"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background">
                    <QrCode className="size-4 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">QR Ph</p>
                    <p className="text-xs text-muted-foreground">Pay in PHP</p>
                  </div>
                  {currency === "PHP" ? (
                    <Check className="ml-auto size-4 text-primary" />
                  ) : null}
                </button>
                <button
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                    currency === "USD"
                      ? "border-primary/40 bg-accent/30"
                      : "border-border/70 bg-card/60 hover:bg-accent/10",
                  )}
                  onClick={() => setCurrency("USD")}
                  type="button"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background">
                    <CreditCard className="size-4 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Card</p>
                    <p className="text-xs text-muted-foreground">Pay in USD</p>
                  </div>
                  {currency === "USD" ? (
                    <Check className="ml-auto size-4 text-primary" />
                  ) : null}
                </button>
              </div>
            </div>

            {/* Error */}
            {state.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}

            {/* Submit */}
            <form action={formAction}>
              <input name="workspaceId" type="hidden" value={workspaceId} />
              <input name="plan" type="hidden" value={selectedPlan} />
              <input name="currency" type="hidden" value={currency} />
              <Button
                className="w-full"
                disabled={isPending}
                size="lg"
                type="submit"
              >
                {isPending ? (
                  <>
                    <Spinner aria-hidden="true" />
                    Processing...
                  </>
                ) : (
                  <>
                    {isQrPh ? "Generate QR code" : "Continue to checkout"}
                    <ArrowRight data-icon="inline-end" />
                  </>
                )}
              </Button>
            </form>

            {/* Redirect notice */}
            {state.checkoutUrl ? (
              <p className="text-center text-sm text-muted-foreground">
                <Spinner className="mr-1.5 inline-block" aria-hidden="true" />
                Redirecting to payment page...
              </p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── QR Ph payment sub-view ───────────────────────────────────────────────── */

function QrPhPaymentView({
  qrData,
  plan,
  onClose,
}: {
  qrData: NonNullable<CheckoutActionState["qrData"]>;
  plan: PaidPlan;
  onClose: () => void;
}) {
  return (
    <div className="grid gap-5 pt-2">
      <div className="mx-auto flex flex-col items-center gap-4">
        <div className="rounded-xl border border-border/70 bg-white p-4">
          <QRCode
            value={qrData.qrCodeData}
            size={200}
            level="M"
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {formatPrice(qrData.amount, "PHP")} — {planMeta[plan].label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scan with GCash, Maya, or any QR Ph-supported app
          </p>
        </div>
      </div>

      {qrData.qrCodeData.startsWith("https://") ? (
        <div className="flex justify-center">
          <Button asChild variant="secondary" size="sm" className="mt-2">
            <a href={qrData.qrCodeData} target="_blank" rel="noreferrer">
              Open Test Payment Page (Dev Only)
            </a>
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline">Awaiting payment</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Expires</span>
            <span className="text-foreground">
              {new Date(qrData.expiresAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Your workspace will be upgraded automatically once payment is confirmed.
        This page can be closed — the upgrade will still apply.
      </p>

      <Button onClick={onClose} variant="outline">
        Done
      </Button>
    </div>
  );
}
