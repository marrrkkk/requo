"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Clock3,
  CreditCard,
  Layers,
  QrCode,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
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

import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  cancelPendingQrCheckoutAction,
  createCheckoutAction,
} from "@/features/billing/actions";

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
  onPaymentProcessingStart?: (plan: PaidPlan) => void;
};

type PaymentMethod = "qrph" | "card";
type CheckoutView = "selection" | "qr" | "paddle";



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
  workspaceName,
  checkoutError,
  onCheckoutErrorChange,
  onPaymentProcessingStart,
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
            updateCheckoutError(null);
            setIsAwaitingPaddleConfirmation(false);
            onPaymentProcessingStart?.(plan);
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
    onPaymentProcessingStart,
    paddle,
    plan,
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
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle className="text-xl">
              {view === "paddle"
                ? "Complete your payment"
                : view === "qr"
                  ? "Scan to pay"
                  : `Upgrade to ${planMeta[plan].label}`}
            </DialogTitle>
            <DialogDescription>
              {view === "paddle"
                ? "Finish the secure checkout below."
                : view === "qr"
                  ? "Scan the QR code with your banking app. You can return to the same QR code while it is active."
                  : "Choose a payment method and confirm the workspace upgrade."}
            </DialogDescription>
          </DialogHeader>

          {view === "paddle" ? (
          <DialogBody className="overflow-y-auto p-0">
            {activePaddleTransactionId ? (
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
            <DialogBody className="overflow-y-auto p-0">
              <div className="flex flex-col gap-5 px-6 py-6">
                {/* Workspace indicator */}
                {workspaceName ? (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Layers className="size-4 shrink-0" />
                    <span className="truncate">{workspaceName}</span>
                  </div>
                ) : null}

                {/* Plan badge */}
                <div className="flex items-center gap-3">
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
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-base font-semibold text-foreground">
                      {planMeta[plan].label}
                    </p>
                    <Badge variant="outline">Selected plan</Badge>
                  </div>
                </div>

                {/* Billing cycle */}
                <div className="flex flex-col gap-2.5">
                  <p className="meta-label">Billing cycle</p>
                  <Tabs
                    onValueChange={(value) => {
                      if (!isQrPh) {
                        setInterval(
                          value === "yearly" ? "yearly" : "monthly",
                        );
                        updateCheckoutError(null);
                      }
                    }}
                    value={effectiveInterval}
                  >
                    <TabsList className="w-full">
                      <TabsTrigger className="flex-1" disabled={isQrPh} value="monthly">
                        Monthly
                      </TabsTrigger>
                      <TabsTrigger className="flex-1" disabled={isQrPh} value="yearly">
                        Yearly
                        <Badge variant="secondary">-{savingsPercent}%</Badge>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {isQrPh ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      QR Ph supports monthly billing only.
                    </p>
                  ) : effectiveInterval === "yearly" ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      {getMonthlyEquivalentLabel(plan, currency)} billed yearly.
                    </p>
                  ) : null}
                </div>

                {/* Payment method */}
                <div className="flex flex-col gap-2.5">
                  <p className="meta-label">Payment method</p>
                  <div className="grid gap-2">
                    {isPH ? (
                      <button
                        aria-pressed={paymentMethod === "qrph"}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all hover:border-border hover:bg-accent/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
                          paymentMethod === "qrph"
                            ? "border-primary/50 bg-accent/30"
                            : "border-border/60 bg-card/70",
                        )}
                        onClick={() => {
                          setPaymentMethod("qrph");
                          updateCheckoutError(null);
                        }}
                        type="button"
                      >
                        <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                          <Image
                            alt=""
                            className="size-full object-contain"
                            height={32}
                            src="/qrph.svg"
                            width={32}
                          />
                        </span>
                        <span className="flex-1 text-sm font-medium text-foreground">
                          QR Ph
                        </span>
                        <span className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          paymentMethod === "qrph"
                            ? "border-primary bg-primary"
                            : "border-border",
                        )}>
                          {paymentMethod === "qrph" ? (
                            <span className="size-2 rounded-full bg-primary-foreground" />
                          ) : null}
                        </span>
                      </button>
                    ) : null}
                    <button
                      aria-pressed={paymentMethod === "card"}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all hover:border-border hover:bg-accent/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
                        paymentMethod === "card"
                          ? "border-primary/50 bg-accent/30"
                          : "border-border/60 bg-card/70",
                      )}
                      onClick={() => {
                        setPaymentMethod("card");
                        updateCheckoutError(null);
                      }}
                      type="button"
                    >
                      <CreditCard className="size-5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium text-foreground">
                        Card, PayPal, and more
                      </span>
                      <span className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        paymentMethod === "card"
                          ? "border-primary bg-primary"
                          : "border-border",
                      )}>
                        {paymentMethod === "card" ? (
                          <span className="size-2 rounded-full bg-primary-foreground" />
                        ) : null}
                      </span>
                    </button>
                  </div>
                  {isQrPh ? (
                    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                      <Clock3 className="mt-0.5 size-4 shrink-0" />
                      <span>QR Ph codes stay active for 30 minutes.</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </DialogBody>
            <DialogFooter className="border-t border-border/60 px-6 py-5 sm:px-6 sm:py-5">
              <div className="flex w-full flex-col gap-3">
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
                    <span className="font-medium text-primary">
                      {formatPrice(
                        getPlanPrice(plan, currency, "monthly") * 12 - totalPrice,
                        currency,
                      )}
                      /yr
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-border/40 pt-3">
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

                <form action={formAction}>
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
                          — {formatPrice(totalPrice, currency)}
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
    <div className="grid gap-5 pt-2 pb-2">
      <div className="soft-panel grid gap-5 rounded-xl px-4 py-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto rounded-xl border border-border/70 bg-white p-4 shadow-sm sm:mx-0">
          <QRCode level="M" size={208} value={qrData.qrCodeData} />
        </div>
        <div className="grid gap-4 text-center sm:text-left">
          <div>
            <p className="meta-label">QR Ph checkout</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
              {formatPrice(qrData.amount, "PHP")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {planMeta[plan].label} workspace access
            </p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="size-4" />
            <span>Status</span>
          </div>
          <Badge className="mt-2" variant="outline">
            Awaiting payment
          </Badge>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ReceiptText className="size-4" />
            <span>Expires</span>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">
            {new Date(qrData.expiresAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <Alert>
        <ShieldCheck />
        <AlertTitle>Automatic activation</AlertTitle>
        <AlertDescription>
          The workspace will upgrade once PayMongo confirms the payment.
        </AlertDescription>
      </Alert>

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
