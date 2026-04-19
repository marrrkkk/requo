"use client";

/**
 * Checkout dialog for selecting a plan and payment method.
 *
 * - Monthly / Yearly interval toggle with savings badge
 * - Plan cards with feature highlights and localized pricing
 * - Payment method selection (QR Ph for PHP, Card for USD)
 * - Order summary before CTA
 * - QR Ph inline flow (renders QR code)
 * - Paddle overlay checkout for USD/card
 */

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { CreditCard, QrCode, Check, Zap, Crown, ShoppingCart } from "lucide-react";
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
import { usePaddle, PaddleProvider } from "@/features/billing/components/paddle-provider";
import type { CheckoutActionState } from "@/features/billing/types";
import type { WorkspacePlan } from "@/lib/plans/plans";
import type { BillingCurrency, BillingInterval, BillingRegion, PaidPlan } from "@/lib/billing/types";
import {
  getPlanPriceLabel,
  getPlanPrice,
  formatPrice,
  getMonthlyEquivalentLabel,
  getYearlySavingsPercent,
} from "@/lib/billing/plans";
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

export function CheckoutDialog(props: CheckoutDialogProps) {
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const environment = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "sandbox") as
    | "sandbox"
    | "production";

  if (!clientToken) {
    return <CheckoutDialogInner {...props} />;
  }

  return (
    <PaddleProvider clientToken={clientToken} environment={environment}>
      <CheckoutDialogInner {...props} />
    </PaddleProvider>
  );
}

/* ── Plan feature highlights for the checkout cards ──────────────────────── */

const planHighlightsShort: Record<PaidPlan, string[]> = {
  pro: [
    "Unlimited inquiries & quotes",
    "Multiple inquiry forms",
    "AI assistant & knowledge",
    "Data exports & branding",
  ],
  business: [
    "Everything in Pro",
    "Team members & roles",
    "Priority support",
    "Unlimited businesses",
  ],
};

/* ── Main dialog inner ───────────────────────────────────────────────────── */

function CheckoutDialogInner({
  open,
  onOpenChange,
  workspaceId,
  currentPlan,
  targetPlan,
  defaultCurrency,
  region,
}: CheckoutDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>(
    targetPlan ?? (currentPlan === "pro" ? "business" : "pro"),
  );
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const isPH = region === "PH";
  const [paymentMethod, setPaymentMethod] = useState<"qrph" | "card">(
    isPH ? "qrph" : "card",
  );
  const [processingUpgrade, setProcessingUpgrade] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createCheckoutAction,
    {} as CheckoutActionState,
  );
  const paddle = usePaddle();
  const router = useRouter();
  const handledTxnRef = useRef<string | null>(null);

  // QR Ph → always PHP. Card → always USD (Paddle doesn't support PHP).
  const currency: BillingCurrency = paymentMethod === "qrph" ? "PHP" : "USD";

  // Handle Paddle overlay checkout
  useEffect(() => {
    if (
      state.paddleTransactionId &&
      paddle.isReady &&
      handledTxnRef.current !== state.paddleTransactionId
    ) {
      handledTxnRef.current = state.paddleTransactionId;
      paddle.openCheckout(state.paddleTransactionId, () => {
        setProcessingUpgrade(true);
        setTimeout(() => {
          router.refresh();
          onOpenChange(false);
          setProcessingUpgrade(false);
        }, 3000);
      });
    }
  }, [state.paddleTransactionId, paddle, onOpenChange, router]);

  const isQrPh = paymentMethod === "qrph";
  const showQrCode = state.qrData && isQrPh;
  const savingsPercent = getYearlySavingsPercent(selectedPlan, currency);
  const totalPrice = getPlanPrice(selectedPlan, currency, interval);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl">
            {processingUpgrade
              ? "Processing your upgrade"
              : showQrCode
                ? "Scan to pay"
                : "Upgrade your workspace"}
          </DialogTitle>
          <DialogDescription>
            {processingUpgrade
              ? "Hang tight — we're activating your subscription."
              : showQrCode
                ? "Scan the QR code with your banking app to complete payment."
                : "Choose a plan and billing cycle to unlock premium features."}
          </DialogDescription>
        </DialogHeader>

        {processingUpgrade ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10">
            <Spinner className="size-8" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Your workspace is being upgraded to {planMeta[selectedPlan].label}...
            </p>
          </div>
        ) : showQrCode ? (
          <div className="px-6 pb-6">
            <QrPhPaymentView
              qrData={state.qrData!}
              plan={selectedPlan}
              onClose={() => onOpenChange(false)}
            />
          </div>
        ) : (
          <div className="overflow-y-auto">
            {/* Interval toggle */}
            <div className="flex items-center justify-center px-6 pt-5">
              <div className="inline-flex rounded-full border border-border/70 bg-muted/30 p-1">
                <button
                  className={cn(
                    "relative rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                    interval === "monthly"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setInterval("monthly")}
                  type="button"
                >
                  Monthly
                </button>
                <button
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                    interval === "yearly"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setInterval("yearly")}
                  type="button"
                >
                  Yearly
                  <Badge
                    variant="secondary"
                    className="border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-400/15 dark:text-emerald-400"
                  >
                    -{savingsPercent}%
                  </Badge>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
              {/* Plan selection */}
              <div className="flex flex-col gap-2.5">
                <p className="meta-label">Select plan</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {(["pro", "business"] as const)
                    .filter((p) => p !== currentPlan)
                    .map((plan) => {
                      const isSelected = selectedPlan === plan;
                      const PlanIcon = plan === "pro" ? Zap : Crown;

                      return (
                        <button
                          className={cn(
                            "flex flex-col gap-3 rounded-xl border p-4 text-left transition-all",
                            isSelected
                              ? "border-primary/40 bg-accent/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                              : "border-border/60 bg-card/40 hover:border-border hover:bg-accent/10",
                          )}
                          key={plan}
                          onClick={() => setSelectedPlan(plan)}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <PlanIcon className={cn("size-4", plan === "pro" ? "fill-current text-primary" : "text-violet-500")} />
                              <p className="text-sm font-semibold text-foreground">
                                {planMeta[plan].label}
                              </p>
                            </div>
                            {isSelected ? (
                              <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                                <Check className="size-3 text-primary-foreground" />
                              </div>
                            ) : (
                              <div className="size-5 rounded-full border-2 border-border/70" />
                            )}
                          </div>
                          <div>
                            <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                              {getPlanPriceLabel(plan, currency, interval).replace(interval === "monthly" ? "/mo" : "/yr", "")}
                              <span className="text-sm font-normal text-muted-foreground">
                                {interval === "monthly" ? "/mo" : "/yr"}
                              </span>
                            </p>
                            {interval === "yearly" ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {getMonthlyEquivalentLabel(plan, currency)} billed yearly
                              </p>
                            ) : null}
                          </div>
                          <ul className="flex flex-col gap-1.5">
                            {planHighlightsShort[plan].map((feature) => (
                              <li className="flex items-start gap-2 text-xs leading-5 text-muted-foreground" key={feature}>
                                <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Payment method */}
              <div className="flex flex-col gap-2.5">
                <p className="meta-label">Payment method</p>
                <div className={cn("grid gap-2", isPH && "sm:grid-cols-2")}>
                  {isPH ? (
                    <button
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                        paymentMethod === "qrph"
                          ? "border-primary/40 bg-accent/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                          : "border-border/60 bg-card/40 hover:border-border hover:bg-accent/10",
                      )}
                      onClick={() => setPaymentMethod("qrph")}
                      type="button"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background">
                        <QrCode className="size-4 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">QR Ph</p>
                        <p className="text-xs text-muted-foreground">GCash, Maya</p>
                      </div>
                      {paymentMethod === "qrph" ? (
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary">
                          <Check className="size-3 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="size-5 shrink-0 rounded-full border-2 border-border/70" />
                      )}
                    </button>
                  ) : null}
                  <button
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                      paymentMethod === "card"
                        ? "border-primary/40 bg-accent/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                        : "border-border/60 bg-card/40 hover:border-border hover:bg-accent/10",
                    )}
                    onClick={() => setPaymentMethod("card")}
                    type="button"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background">
                      <CreditCard className="size-4 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">Card</p>
                      <p className="text-xs text-muted-foreground">
                        Visa, Mastercard{isPH ? " · Billed in USD" : ""}
                      </p>
                    </div>
                    {paymentMethod === "card" ? (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary">
                        <Check className="size-3 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="size-5 shrink-0 rounded-full border-2 border-border/70" />
                    )}
                  </button>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Order summary */}
              <div className="soft-panel flex flex-col gap-2.5 rounded-xl px-4 py-3.5">
                <p className="meta-label">Order summary</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {planMeta[selectedPlan].label} plan
                    <span className="ml-1 text-xs">
                      ({interval === "monthly" ? "monthly" : "yearly"})
                    </span>
                  </span>
                  <span className="font-medium text-foreground">
                    {getPlanPriceLabel(selectedPlan, currency, interval)}
                  </span>
                </div>
                {interval === "yearly" ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">You save</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {formatPrice(
                        getPlanPrice(selectedPlan, currency, "monthly") * 12 - totalPrice,
                        currency,
                      )}
                      /yr
                    </span>
                  </div>
                ) : null}
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Due today
                  </span>
                  <span className="font-heading text-lg font-semibold text-foreground">
                    {formatPrice(totalPrice, currency)}
                  </span>
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
                <input name="interval" type="hidden" value={interval} />
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
                      <ShoppingCart className="size-4" data-icon="inline-start" />
                      {isQrPh ? "Generate QR code" : "Continue to checkout"}
                      <span className="ml-1 opacity-70">
                        • {formatPrice(totalPrice, currency)}
                      </span>
                    </>
                  )}
                </Button>
              </form>

              {/* Paddle loading notice */}
              {state.paddleTransactionId ? (
                <p className="text-center text-sm text-muted-foreground">
                  <Spinner className="mr-1.5 inline-block" aria-hidden="true" />
                  Opening checkout...
                </p>
              ) : null}
            </div>
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
    <div className="grid gap-5 pt-4">
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

      <div className="soft-panel overflow-hidden rounded-xl px-0 py-0">
        <div className="grid divide-y divide-border/60">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline">Awaiting payment</Badge>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Expires</span>
            <span className="text-sm font-medium text-foreground">
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
