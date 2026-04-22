"use client";

/**
 * Checkout dialog for selecting a plan and payment method.
 *
 * - Monthly / Yearly interval toggle with savings badge
 * - Plan cards with feature highlights and localized pricing
 * - Payment method selection (QR Ph for PHP, Card/PayPal/etc. for USD)
 * - Order summary before CTA
 * - QR Ph inline flow (renders QR code, persists across refreshes)
 * - Paddle inline checkout for Card, PayPal, Apple Pay, Google Pay
 */

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { QrCode, Check, Zap, Crown, ShoppingCart, Wallet } from "lucide-react";
import QRCode from "react-qr-code";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  createCheckoutAction,
  cleanupExpiredPendingAction,
} from "@/features/billing/actions";
import { usePaddle, PaddleProvider } from "@/features/billing/components/paddle-provider";
import type { CheckoutActionState, PendingQrPhData } from "@/features/billing/types";
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

/* ── Paddle inline container ID ──────────────────────────────────────────── */

const PADDLE_FRAME_TARGET = "requo-paddle-checkout";

/* ── SessionStorage cache for pending QR data ────────────────────────────── */

const PENDING_QR_KEY = "requo:pending-qrph";

function getCachedPendingQr(workspaceId: string): PendingQrPhData | null {
  try {
    const raw = sessionStorage.getItem(`${PENDING_QR_KEY}:${workspaceId}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingQrPhData;
    if (new Date(data.expiresAt) <= new Date()) {
      sessionStorage.removeItem(`${PENDING_QR_KEY}:${workspaceId}`);
      // Flag for automatic server-side pending status cleanup
      sessionStorage.setItem(`${PENDING_QR_KEY}:expired:${workspaceId}`, "1");
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedPendingQr(workspaceId: string, data: PendingQrPhData): void {
  try {
    sessionStorage.setItem(
      `${PENDING_QR_KEY}:${workspaceId}`,
      JSON.stringify(data),
    );
  } catch {
    /* storage full or unavailable */
  }
}

export function clearCachedPendingQr(workspaceId: string): void {
  try {
    sessionStorage.removeItem(`${PENDING_QR_KEY}:${workspaceId}`);
  } catch {
    /* ignore */
  }
}

/* ── Main dialog inner ───────────────────────────────────────────────────── */

function CheckoutDialogInner({
  open,
  onOpenChange,
  workspaceId,
  currentPlan,
  targetPlan,
  region,
}: CheckoutDialogProps) {
  // ── Initialize from sessionStorage cache (instant, no server call) ───────
  const cachedQr = getCachedPendingQr(workspaceId);

  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>(
    () => cachedQr?.plan as PaidPlan ?? targetPlan ?? (currentPlan === "pro" ? "business" : "pro"),
  );
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const isPH = region === "PH";
  const [paymentMethod, setPaymentMethod] = useState<"qrph" | "card">(
    () => cachedQr ? "qrph" : isPH ? "qrph" : "card",
  );
  const [processingUpgrade, setProcessingUpgrade] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createCheckoutAction,
    {} as CheckoutActionState,
  );
  const paddle = usePaddle();
  const router = useRouter();
  const handledTxnRef = useRef<string | null>(null);

  // ── Pending QR — derived from sessionStorage cache, no state needed ──────
  const pendingQr = cachedQr;

  // ── Auto-cleanup expired pending subscription ────────────────────────────
  const cleanupFiredRef = useRef(false);
  useEffect(() => {
    if (cleanupFiredRef.current) return;
    const expiredKey = `${PENDING_QR_KEY}:expired:${workspaceId}`;
    try {
      if (sessionStorage.getItem(expiredKey)) {
        sessionStorage.removeItem(expiredKey);
        cleanupFiredRef.current = true;
        // Fire-and-forget: clear the pending subscription status on the server
        cleanupExpiredPendingAction(workspaceId).catch(() => {});
      }
    } catch { /* ignore */ }
  }, [workspaceId]);

  // ── Paddle inline state ──────────────────────────────────────────────────
  const [showPaddleInline, setShowPaddleInline] = useState(false);
  const paddleInlineOpenedRef = useRef<string | null>(null);

  // QR Ph → always PHP. Card → always USD (Paddle doesn't support PHP).
  const currency: BillingCurrency = paymentMethod === "qrph" ? "PHP" : "USD";

  // QRPh is a one-time payment for the selected period, not an auto-renewing subscription.
  // We force monthly here to simplify the mental model — you pay for 1 month of access.
  const effectiveInterval: BillingInterval = paymentMethod === "qrph" ? "monthly" : interval;
  const isQrPh = paymentMethod === "qrph";

  // ── Persist fresh QR from checkout action into sessionStorage ─────────────
  useEffect(() => {
    if (state.qrData) {
      setCachedPendingQr(workspaceId, {
        qrCodeData: state.qrData.qrCodeData,
        paymentIntentId: state.qrData.paymentIntentId,
        expiresAt: state.qrData.expiresAt,
        amount: state.qrData.amount,
        currency: "PHP",
        plan: selectedPlan,
      });
    }
  }, [state.qrData, workspaceId, selectedPlan]);

  // Reset ephemeral UI state when dialog closes (keep cache alive)
  useEffect(() => {
    if (!open) {
      setShowPaddleInline(false);
      paddleInlineOpenedRef.current = null;
    }
  }, [open]);

  // ── Handle Paddle inline checkout ────────────────────────────────────────
  useEffect(() => {
    if (
      state.paddleTransactionId &&
      paddle.isReady &&
      handledTxnRef.current !== state.paddleTransactionId
    ) {
      handledTxnRef.current = state.paddleTransactionId;
      setShowPaddleInline(true);

      // Small delay to ensure the container div is rendered
      requestAnimationFrame(() => {
        paddle.openCheckout(
          state.paddleTransactionId!,
          () => {
            setProcessingUpgrade(true);
            setTimeout(() => {
              router.refresh();
              onOpenChange(false);
              setProcessingUpgrade(false);
            }, 3000);
          },
          {
            displayMode: "inline",
            frameTarget: PADDLE_FRAME_TARGET,
            frameInitialHeight: "450",
            frameStyle:
              "width: 100%; min-width: 312px; background-color: transparent; border: none; border-radius: 12px;",
          },
        );
      });
    }
  }, [state.paddleTransactionId, paddle, onOpenChange, router]);

  // Derive QR display from action result or cached pending QR
  const showQrCode = (state.qrData && isQrPh) || pendingQr;
  const activeQrData = state.qrData ?? (pendingQr
    ? {
        qrCodeData: pendingQr.qrCodeData,
        paymentIntentId: pendingQr.paymentIntentId,
        expiresAt: pendingQr.expiresAt,
        amount: pendingQr.amount,
        currency: "PHP" as const,
      }
    : null);

  const savingsPercent = getYearlySavingsPercent(selectedPlan, currency);
  const totalPrice = getPlanPrice(selectedPlan, currency, effectiveInterval);

  // ── Handle dialog close — close Paddle inline if open ────────────────────
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && showPaddleInline) {
        paddle.closeCheckout();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, showPaddleInline, paddle],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl px-2">
            {processingUpgrade
              ? "Processing your upgrade"
              : showPaddleInline
                ? "Complete your payment"
                : showQrCode
                  ? "Scan to pay"
                  : "Upgrade your workspace"}
          </DialogTitle>
          <DialogDescription className="px-2">
            {processingUpgrade
              ? "Hang tight — we're activating your subscription."
              : showPaddleInline
                ? "Choose your preferred payment method below."
                : showQrCode
                  ? "Scan the QR code with your banking app to complete payment."
                  : "Choose a plan and billing cycle to unlock premium features."}
          </DialogDescription>
        </DialogHeader>

        {processingUpgrade ? (
          <DialogBody className="flex flex-col items-center gap-4 py-10">
            <Spinner className="size-8" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Your workspace is being upgraded to {planMeta[selectedPlan].label}...
            </p>
          </DialogBody>
        ) : showPaddleInline ? (
          <DialogBody className="p-0 overflow-y-auto">
            {/* Order summary above Paddle frame */}
            <div className="flex items-center justify-between px-6 py-4 text-sm border-b border-border/40">
              <span className="text-muted-foreground">
                {planMeta[selectedPlan].label} plan
                <span className="ml-1 text-xs">
                  ({effectiveInterval === "monthly" ? "monthly" : "yearly"})
                </span>
              </span>
              <span className="font-medium text-foreground">
                {getPlanPriceLabel(selectedPlan, currency, effectiveInterval)}
              </span>
            </div>
            {/* Paddle inline checkout container */}
            <div className="px-4 py-4">
              <div className={PADDLE_FRAME_TARGET} />
            </div>
          </DialogBody>
        ) : showQrCode && activeQrData ? (
          <DialogBody className="pb-6">
            <QrPhPaymentView
              qrData={activeQrData}
              plan={selectedPlan}
              onClose={() => handleOpenChange(false)}
            />
          </DialogBody>
        ) : (
          <>
            <DialogBody className="bg-muted/10 p-0 overflow-y-auto">
              <div className="flex flex-col gap-6 px-6 py-6">
                {/* Interval toggle (Card only) */}
                {!isQrPh ? (
                  <div className="flex items-center justify-center">
                    <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-1">
                      <button
                        className={cn(
                          "relative rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                          effectiveInterval === "monthly"
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
                          effectiveInterval === "yearly"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => setInterval("yearly")}
                        type="button"
                      >
                        Yearly
                        <Badge
                          variant="secondary"
                          className="border-primary/20 bg-primary/10 px-1.5 py-0 text-[10px] text-primary dark:border-primary/25 dark:bg-primary/15"
                        >
                          -{savingsPercent}%
                        </Badge>
                      </button>
                    </div>
                  </div>
                ) : null}

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
                                : "border-border/60 bg-card/60 hover:border-border hover:bg-accent/10",
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
                                <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                                  <Check className="size-3" />
                                </div>
                              ) : (
                                <div className="size-5 rounded-full border-2 border-border/70" />
                              )}
                            </div>
                            <div>
                              <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                                {getPlanPriceLabel(plan, currency, effectiveInterval).replace(effectiveInterval === "monthly" ? "/mo" : "/yr", "")}
                                <span className="text-sm font-normal text-muted-foreground">
                                  {effectiveInterval === "monthly" ? "/mo" : "/yr"}
                                </span>
                              </p>
                              {effectiveInterval === "yearly" ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {getMonthlyEquivalentLabel(plan, currency)} billed yearly
                                </p>
                              ) : null}
                            </div>
                            <ul className="flex flex-col gap-1.5 pt-1">
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
                            : "border-border/60 bg-card/60 hover:border-border hover:bg-accent/10",
                        )}
                        onClick={() => setPaymentMethod("qrph")}
                        type="button"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background shadow-xs">
                          <QrCode className="size-4 text-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">QR Ph</p>
                          <p className="text-xs text-muted-foreground">GCash, Maya</p>
                        </div>
                        {paymentMethod === "qrph" ? (
                          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                            <Check className="size-3" />
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
                          : "border-border/60 bg-card/60 hover:border-border hover:bg-accent/10",
                      )}
                      onClick={() => setPaymentMethod("card")}
                      type="button"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background shadow-xs">
                        <Wallet className="size-4 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">Card, PayPal & more</p>
                        <p className="text-xs text-muted-foreground">
                          Visa, Mastercard, PayPal, Apple Pay, Google Pay
                          {isPH ? " · Billed in USD" : ""}
                        </p>
                      </div>
                      {paymentMethod === "card" ? (
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <Check className="size-3" />
                        </div>
                      ) : (
                        <div className="size-5 shrink-0 rounded-full border-2 border-border/70" />
                      )}
                    </button>
                  </div>
                  {isQrPh ? (
                    <p className="mt-1 px-1 text-xs text-muted-foreground">
                      QRPh is a one-time payment for 1 month of access. We will email you when it&apos;s time to renew.
                    </p>
                  ) : null}
                </div>
              </div>
            </DialogBody>
            <Separator className="bg-border/40" />
            <DialogFooter className="bg-card px-6 py-6 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4 w-full">
                {/* Order summary */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {planMeta[selectedPlan].label} plan
                    <span className="ml-1 text-xs">
                      ({isQrPh ? "one-time payment" : effectiveInterval === "monthly" ? "monthly" : "yearly"})
                    </span>
                  </span>
                  <span className="font-medium text-foreground">
                    {getPlanPriceLabel(selectedPlan, currency, effectiveInterval)}
                  </span>
                </div>
                {effectiveInterval === "yearly" && !isQrPh ? (
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
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-medium text-foreground">
                    Due today
                  </span>
                  <span className="font-heading text-lg font-semibold text-foreground">
                    {formatPrice(totalPrice, currency)}
                  </span>
                </div>

                {/* Error */}
                {state.error ? (
                  <p className="mt-1 text-sm text-destructive">{state.error}</p>
                ) : null}

                {/* Submit */}
                <form action={formAction} className="mt-2">
                  <input name="workspaceId" type="hidden" value={workspaceId} />
                  <input name="plan" type="hidden" value={selectedPlan} />
                  <input name="currency" type="hidden" value={currency} />
                  <input name="interval" type="hidden" value={effectiveInterval} />
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
                        {isQrPh ? "Pay with QR Ph" : "Continue to checkout"}
                        <span className="ml-1 opacity-70">
                          • {formatPrice(totalPrice, currency)}
                        </span>
                      </>
                    )}
                  </Button>
                </form>

                {/* Paddle loading notice */}
                {state.paddleTransactionId && !showPaddleInline ? (
                  <p className="text-center text-sm text-muted-foreground">
                    <Spinner className="mr-1.5 inline-block" aria-hidden="true" />
                    Preparing checkout...
                  </p>
                ) : null}
              </div>
            </DialogFooter>
          </>
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
    <div className="grid gap-5 pt-4 pb-2">
      <div className="mx-auto flex flex-col items-center gap-4">
        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
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
          <Button asChild variant="secondary" size="sm" className="mt-2 text-xs h-8">
            <a href={qrData.qrCodeData} target="_blank" rel="noreferrer">
              Open Test Payment Page (Dev Only)
            </a>
          </Button>
        </div>
      ) : null}

      <div className="soft-panel overflow-hidden rounded-xl px-0 py-0 text-sm">
        <div className="grid divide-y divide-border/60">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline" className="bg-background">Awaiting payment</Badge>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-foreground">Expires</span>
            <span className="font-medium text-foreground">
              {new Date(qrData.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        This is a one-time payment for 1 month of access. Your workspace will be upgraded automatically once payment is confirmed.
      </p>

      <Button onClick={onClose} variant="outline" className="w-full">
        Close
      </Button>
    </div>
  );
}
