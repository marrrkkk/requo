"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Briefcase,
  Building2,
  QrCode,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import QRCode from "react-qr-code";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  cancelPendingQrCheckoutAction,
  createCheckoutAction,
} from "@/features/billing/actions";
import {
  CardAndMoreBrandMarks,
  QrPhBrandMark,
} from "@/features/billing/components/payment-method-brands";
import {
  PaddleProvider,
  usePaddle,
} from "@/features/billing/components/paddle-provider";
import {
  clearCachedPendingCheckout,
  getCachedPendingCheckoutForPlan,
  setCachedPendingCheckout,
  type PersistedPendingCheckout,
} from "@/features/billing/pending-checkout";
import type {
  CheckoutActionState,
  CheckoutDialogProps,
  PendingQrPhData,
} from "@/features/billing/types";
import {
  formatPrice,
  getMonthlyEquivalentLabel,
  getPlanPrice,
  getPlanPriceLabel,
  getYearlySavingsPercent,
} from "@/lib/billing/plans";
import type {
  BillingCurrency,
  BillingInterval,
  PaidPlan,
} from "@/lib/billing/types";
import { planMeta } from "@/lib/plans";
import { cn } from "@/lib/utils";

type ControlledCheckoutDialogProps = CheckoutDialogProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingCheckout?: PersistedPendingCheckout | null;
  checkoutError?: string | null;
  onCheckoutErrorChange?: (error: string | null) => void;
  onPaddleTransactionChange?: (
    checkout: { plan: PaidPlan; transactionId: string } | null,
  ) => void;
};

type PaymentMethod = "qrph" | "card";
type CheckoutView = "selection" | "qr" | "paddle";

const planHighlightsShort: Record<PaidPlan, string[]> = {
  pro: [
    "Unlimited inquiries and quotes",
    "Multiple inquiry forms",
    "AI assistant and knowledge",
    "Data exports and branding",
  ],
  business: [
    "Everything in Pro",
    "Team members and roles",
    "Priority support",
    "Unlimited businesses",
  ],
};

const PADDLE_FRAME_TARGET = "requo-paddle-checkout";
const isDevelopment = process.env.NODE_ENV === "development";

function toPendingQrData(
  checkout: PersistedPendingCheckout | null,
): PendingQrPhData | null {
  if (!checkout || checkout.provider !== "paymongo") {
    return null;
  }

  return {
    amount: checkout.amount,
    currency: "PHP",
    expiresAt: checkout.expiresAt,
    paymentIntentId: checkout.paymentIntentId,
    plan: checkout.plan,
    qrCodeData: checkout.qrCodeData,
  };
}

export function CheckoutDialog(props: ControlledCheckoutDialogProps) {
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const environment = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "sandbox") as
    | "sandbox"
    | "production";

  const dialog = <CheckoutDialogInner {...props} />;

  if (!clientToken) {
    return dialog;
  }

  return (
    <PaddleProvider clientToken={clientToken} environment={environment}>
      {dialog}
    </PaddleProvider>
  );
}

function CheckoutDialogInner({
  onOpenChange,
  open,
  plan,
  region,
  workspaceId,
  checkoutError,
  onCheckoutErrorChange,
  onPaddleTransactionChange,
  pendingCheckout,
}: ControlledCheckoutDialogProps) {
  const router = useRouter();
  const paddle = usePaddle();
  const initialPendingCheckout =
    pendingCheckout?.plan === plan
      ? pendingCheckout
      : getCachedPendingCheckoutForPlan(workspaceId, plan);
  const initialPendingQr = toPendingQrData(initialPendingCheckout);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    if (initialPendingCheckout?.provider === "paymongo") {
      return "qrph";
    }

    return region === "PH" ? "qrph" : "card";
  });
  const [view, setView] = useState<CheckoutView>(() => {
    if (initialPendingCheckout?.provider === "paymongo") {
      return "qr";
    }

    return "selection";
  });
  const [localCheckoutError, setLocalCheckoutError] = useState<string | null>(
    checkoutError ?? null,
  );
  const [pendingQr, setPendingQr] = useState<PendingQrPhData | null>(
    initialPendingQr,
  );
  const [activePaddleTransactionId, setActivePaddleTransactionId] = useState<
    string | null
  >(null);
  const [isAwaitingPaddleConfirmation, setIsAwaitingPaddleConfirmation] =
    useState(false);
  const [isCancelingQr, setIsCancelingQr] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createCheckoutAction,
    {} as CheckoutActionState,
  );
  const openedPaddleTransactionRef = useRef<string | null>(null);
  const isPH = region === "PH";
  const isQrPh = paymentMethod === "qrph";
  const currency: BillingCurrency = isQrPh ? "PHP" : "USD";
  const effectiveInterval: BillingInterval = isQrPh ? "monthly" : interval;
  const totalPrice = getPlanPrice(plan, currency, effectiveInterval);
  const savingsPercent = getYearlySavingsPercent(plan, currency);
  const PlanIcon = plan === "pro" ? Briefcase : Building2;

  const updateCheckoutError = useCallback(
    (message: string | null) => {
      setLocalCheckoutError(message);
      onCheckoutErrorChange?.(message);
    },
    [onCheckoutErrorChange],
  );

  useEffect(() => {
    const matchingPendingCheckout =
      pendingCheckout?.plan === plan ? pendingCheckout : null;

    queueMicrotask(() => {
      if (!matchingPendingCheckout) {
        setPendingQr(null);
        setIsCancelingQr(false);
        return;
      }

      if (matchingPendingCheckout.provider === "paymongo") {
        setPendingQr(toPendingQrData(matchingPendingCheckout));
        setActivePaddleTransactionId(null);
        onPaddleTransactionChange?.(null);
        setIsAwaitingPaddleConfirmation(false);
        setPaymentMethod("qrph");
        setView("qr");
      }
    });
  }, [onPaddleTransactionChange, pendingCheckout, plan]);

  useEffect(() => {
    if (!open) {
      openedPaddleTransactionRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!state.qrData) {
      return;
    }

    const nextPendingCheckout: PersistedPendingCheckout = {
      amount: state.qrData.amount,
      currency: "PHP",
      expiresAt: state.qrData.expiresAt,
      paymentIntentId: state.qrData.paymentIntentId,
      plan,
      provider: "paymongo",
      qrCodeData: state.qrData.qrCodeData,
    };

    setCachedPendingCheckout(workspaceId, nextPendingCheckout);
    queueMicrotask(() => {
      setPendingQr(toPendingQrData(nextPendingCheckout));
      setActivePaddleTransactionId(null);
      onPaddleTransactionChange?.(null);
      setIsAwaitingPaddleConfirmation(false);
      updateCheckoutError(null);
      setIsCancelingQr(false);
      setView("qr");
    });
  }, [
    onPaddleTransactionChange,
    plan,
    state.qrData,
    updateCheckoutError,
    workspaceId,
  ]);

  useEffect(() => {
    if (!state.paddleTransactionId) {
      return;
    }

    const transactionId = state.paddleTransactionId;

    queueMicrotask(() => {
      setPendingQr(null);
      setActivePaddleTransactionId(transactionId);
      onPaddleTransactionChange?.({ plan, transactionId });
      setIsAwaitingPaddleConfirmation(false);
      updateCheckoutError(null);
      setView("paddle");
    });
  }, [
    onPaddleTransactionChange,
    plan,
    state.paddleTransactionId,
    updateCheckoutError,
  ]);

  useEffect(() => {
    if (!state.error) {
      return;
    }

    const error = state.error;

    queueMicrotask(() => {
      setIsCancelingQr(false);
      setIsAwaitingPaddleConfirmation(false);
      setView("selection");
      updateCheckoutError(error);
    });
  }, [state.error, updateCheckoutError]);

  useEffect(() => {
    if (
      !open ||
      !activePaddleTransactionId ||
      !paddle.isReady ||
      isAwaitingPaddleConfirmation ||
      openedPaddleTransactionRef.current === activePaddleTransactionId
    ) {
      return;
    }

    openedPaddleTransactionRef.current = activePaddleTransactionId;

    requestAnimationFrame(() => {
      paddle.openCheckout(
        activePaddleTransactionId,
        {
          onClose: () => {
            onOpenChange(false);
          },
          onComplete: () => {
            setIsAwaitingPaddleConfirmation(true);
            updateCheckoutError(null);
            setView("paddle");
          },
          onError: () => {
            setIsAwaitingPaddleConfirmation(false);
            updateCheckoutError(null);
            setView("paddle");
          },
          onPaymentFailed: () => {
            setIsAwaitingPaddleConfirmation(false);
            updateCheckoutError(null);
            setView("paddle");
          },
        },
        {
          displayMode: "inline",
          frameInitialHeight: "450",
          frameStyle:
            "width: 100%; min-width: 312px; background-color: transparent; border: none; border-radius: 12px;",
          frameTarget: PADDLE_FRAME_TARGET,
        },
      );
    });
  }, [
    activePaddleTransactionId,
    isAwaitingPaddleConfirmation,
    onOpenChange,
    paddle,
    open,
    updateCheckoutError,
  ]);

  const handleQrCancel = useCallback(async () => {
    if (!pendingQr) {
      return;
    }

    setIsCancelingQr(true);
    updateCheckoutError(null);

    const result = await cancelPendingQrCheckoutAction(
      workspaceId,
      pendingQr.paymentIntentId,
    );

    if (!result.ok) {
      setIsCancelingQr(false);
      updateCheckoutError(result.error);
      return;
    }

    if (result.outcome === "already_paid") {
      setIsCancelingQr(false);
      onOpenChange(false);
      router.refresh();
      return;
    }

    clearCachedPendingCheckout(workspaceId, "paymongo");
    setPendingQr(null);
    setIsCancelingQr(false);
    setView("selection");
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, pendingQr, router, updateCheckoutError, workspaceId]);

  const resetPaddleCheckout = useCallback(() => {
    if (activePaddleTransactionId) {
      paddle.closeCheckout();
    }

    openedPaddleTransactionRef.current = null;
    setActivePaddleTransactionId(null);
    onPaddleTransactionChange?.(null);
    setIsAwaitingPaddleConfirmation(false);
    setView("selection");
    updateCheckoutError(null);
  }, [
    activePaddleTransactionId,
    onPaddleTransactionChange,
    paddle,
    updateCheckoutError,
  ]);

  const confirmPaddleCheckoutClose = useCallback(() => {
    setIsCloseConfirmOpen(false);
    resetPaddleCheckout();
    onOpenChange(false);
  }, [onOpenChange, resetPaddleCheckout]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }

      if (isPending) {
        return;
      }

      if (
        view === "paddle" &&
        activePaddleTransactionId &&
        !isAwaitingPaddleConfirmation
      ) {
        setIsCloseConfirmOpen(true);
        return;
      }

      onOpenChange(false);
    },
    [
      activePaddleTransactionId,
      isAwaitingPaddleConfirmation,
      isPending,
      onOpenChange,
      view,
    ],
  );

  const resolvedCheckoutError = checkoutError ?? localCheckoutError;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="px-2 text-xl">
            {view === "paddle"
              ? "Complete your payment"
              : view === "qr"
                ? "Scan to pay"
                : `Upgrade to ${planMeta[plan].label}`}
          </DialogTitle>
          <DialogDescription className="px-2">
            {view === "paddle"
              ? "Finish the payment in the inline checkout below."
              : view === "qr"
                ? "Scan the QR code with your banking app. You can close this dialog and continue from the same QR code later."
                : "Choose how you want to pay for this plan upgrade."}
          </DialogDescription>
        </DialogHeader>

        {view === "paddle" ? (
          <DialogBody className="overflow-y-auto p-0">
            {isAwaitingPaddleConfirmation ? (
              <div className="flex flex-col items-center gap-4 px-6 py-10">
                <Spinner aria-hidden="true" className="size-8" />
                <div className="space-y-1 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Waiting for payment confirmation
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll update this workspace as soon as Paddle confirms
                    the payment.
                  </p>
                </div>
              </div>
            ) : activePaddleTransactionId ? (
              <>
                <div className="flex items-center justify-between border-b border-border/40 px-6 py-4 text-sm">
                  <span className="text-muted-foreground">
                    {planMeta[plan].label} plan
                    <span className="ml-1 text-xs">
                      ({effectiveInterval === "monthly" ? "monthly" : "yearly"})
                    </span>
                  </span>
                  <span className="font-medium text-foreground">
                    {getPlanPriceLabel(plan, currency, effectiveInterval)}
                  </span>
                </div>
                <div className="px-4 py-4">
                  <div className={PADDLE_FRAME_TARGET} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 px-6 py-10">
                <Spinner aria-hidden="true" className="size-8" />
                <p className="text-center text-sm text-muted-foreground">
                  Restoring your checkout session.
                </p>
              </div>
            )}
          </DialogBody>
        ) : view === "qr" && pendingQr ? (
          <DialogBody className="overflow-y-auto pb-6">
            <QrPhPaymentView
              error={resolvedCheckoutError}
              isCanceling={isCancelingQr}
              onCancel={() => {
                void handleQrCancel();
              }}
              plan={plan}
              qrData={pendingQr}
            />
          </DialogBody>
        ) : (
          <>
            <DialogBody className="overflow-y-auto bg-muted/10 p-0">
              <div className="flex flex-col gap-6 px-6 py-6">
                <div className="soft-panel grid gap-4 rounded-2xl px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background">
                      <PlanIcon
                        className={cn(
                          "size-4",
                          plan === "pro"
                            ? "text-primary"
                            : "text-foreground",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {planMeta[plan].label}
                        </p>
                        <Badge variant="outline">Selected plan</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {planMeta[plan].description}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {planHighlightsShort[plan].map((feature) => (
                      <p className="text-sm text-muted-foreground" key={feature}>
                        {feature}
                      </p>
                    ))}
                  </div>
                </div>

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
                        onClick={() => {
                          setInterval("monthly");
                          updateCheckoutError(null);
                        }}
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
                        onClick={() => {
                          setInterval("yearly");
                          updateCheckoutError(null);
                        }}
                        type="button"
                      >
                        Yearly
                        <Badge
                          className="border-primary/20 bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
                          variant="secondary"
                        >
                          -{savingsPercent}%
                        </Badge>
                      </button>
                    </div>
                  </div>
                ) : null}

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
                        onClick={() => {
                          setPaymentMethod("qrph");
                          updateCheckoutError(null);
                        }}
                        type="button"
                      >
                        <div className="min-w-0 flex-1">
                          <QrPhBrandMark />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Generate a QR code and pay from a banking app.
                          </p>
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
                      onClick={() => {
                        setPaymentMethod("card");
                        updateCheckoutError(null);
                      }}
                      type="button"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background">
                            <Wallet className="size-4 text-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Cards and more
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Card, PayPal, and Google Pay
                              {isPH ? " billed in USD" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <CardAndMoreBrandMarks />
                        </div>
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
                    <p className="px-1 text-xs text-muted-foreground">
                      QR Ph is a one-time payment for one month of access.
                    </p>
                  ) : effectiveInterval === "yearly" ? (
                    <p className="px-1 text-xs text-muted-foreground">
                      {getMonthlyEquivalentLabel(plan, currency)} billed yearly.
                    </p>
                  ) : null}
                  {paymentMethod === "card" && isPH ? (
                    <p className="px-1 text-xs text-muted-foreground">
                      Cards and more are billed in USD through Paddle.
                    </p>
                  ) : null}
                </div>
              </div>
            </DialogBody>
            <Separator className="bg-border/40" />
            <DialogFooter className="bg-card px-6 py-6 sm:px-6 sm:py-6">
              <div className="flex w-full flex-col gap-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {planMeta[plan].label} plan
                    <span className="ml-1 text-xs">
                      ({isQrPh ? "one-time payment" : effectiveInterval})
                    </span>
                  </span>
                  <span className="font-medium text-foreground">
                    {getPlanPriceLabel(plan, currency, effectiveInterval)}
                  </span>
                </div>
                {!isQrPh && effectiveInterval === "yearly" ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">You save</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(
                        getPlanPrice(plan, currency, "monthly") * 12 - totalPrice,
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

                {resolvedCheckoutError ? (
                  <Alert variant="destructive">
                    <AlertCircle />
                    <AlertTitle>Payment issue</AlertTitle>
                    <AlertDescription>{resolvedCheckoutError}</AlertDescription>
                  </Alert>
                ) : null}

                <form action={formAction} className="mt-2">
                  <input name="workspaceId" type="hidden" value={workspaceId} />
                  <input name="plan" type="hidden" value={plan} />
                  <input name="currency" type="hidden" value={currency} />
                  <input
                    name="interval"
                    type="hidden"
                    value={effectiveInterval}
                  />
                  <Button className="w-full" disabled={isPending} size="lg" type="submit">
                    {isPending ? (
                      <>
                        <Spinner aria-hidden="true" />
                        Preparing checkout...
                      </>
                    ) : (
                      <>
                        <ShoppingCart data-icon="inline-start" />
                        {isQrPh ? "Upgrade with QR Ph" : `Upgrade to ${planMeta[plan].label}`}
                        <span className="ml-1 opacity-70">
                          - {formatPrice(totalPrice, currency)}
                        </span>
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </DialogFooter>
          </>
        )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={open && isCloseConfirmOpen}
        onOpenChange={setIsCloseConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close card checkout?</AlertDialogTitle>
            <AlertDialogDescription>
              Closing now will reset the Paddle card form. You can start a new
              checkout when you are ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">
                Keep checkout open
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={confirmPaddleCheckoutClose}
                type="button"
                variant="destructive"
              >
                Close and reset
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function QrPhPaymentView({
  error,
  isCanceling,
  onCancel,
  plan,
  qrData,
}: {
  error: string | null;
  isCanceling: boolean;
  onCancel: () => void;
  plan: PaidPlan;
  qrData: PendingQrPhData;
}) {
  return (
    <div className="grid gap-5 pt-4 pb-2">
      <div className="mx-auto flex flex-col items-center gap-4">
        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
          <QRCode level="M" size={200} value={qrData.qrCodeData} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {formatPrice(qrData.amount, "PHP")} - {planMeta[plan].label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scan with GCash, Maya, or any QR Ph supported app.
          </p>
        </div>
      </div>

      {isDevelopment && qrData.qrCodeData.startsWith("https://") ? (
        <div className="flex justify-center">
          <Button asChild className="h-8 text-xs" size="sm" variant="secondary">
            <a href={qrData.qrCodeData} rel="noreferrer" target="_blank">
              Open test payment page
            </a>
          </Button>
        </div>
      ) : null}

      <div className="soft-panel overflow-hidden rounded-xl px-0 py-0 text-sm">
        <div className="grid divide-y divide-border/60">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-foreground">Status</span>
            <Badge className="bg-background" variant="outline">
              Awaiting payment
            </Badge>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-foreground">Expires</span>
            <span className="font-medium text-foreground">
              {new Date(qrData.expiresAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        This workspace will upgrade automatically once the payment webhook is
        confirmed.
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Payment issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button className="w-full" onClick={onCancel} type="button" variant="outline">
        {isCanceling ? (
          <>
            <Spinner aria-hidden="true" />
            Canceling pending checkout...
          </>
        ) : (
          <>
            <QrCode data-icon="inline-start" />
            Cancel pending checkout
          </>
        )}
      </Button>
    </div>
  );
}
