"use client";

import {
  useActionState,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { dispatchRouteProgressComplete } from "@/lib/navigation/route-progress";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Spinner } from "@/components/ui/spinner";
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
  getPlanPrice,
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
  onChangePlan?: () => void;
  pendingCheckout?: PersistedPendingCheckout | null;
  checkoutError?: string | null;
  onCheckoutErrorChange?: (error: string | null) => void;
  onPaddleTransactionChange?: (
    checkout: { plan: PaidPlan; transactionId: string } | null,
  ) => void;
  onPaymentProcessingStart?: (plan: PaidPlan) => void;
};

type SubmittedPaymentMethod = "qrph" | "card";
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
  userId,
  businessId,
  businessName,
  checkoutError,
  interval: intervalProp,
  onChangePlan,
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
      : getCachedPendingCheckoutForPlan(userId, plan);
  const initialPendingQr = toPendingQrData(initialPendingCheckout);
  const [interval] = useState<BillingInterval>(intervalProp ?? "monthly");
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
  const [submittedPaymentMethod, setSubmittedPaymentMethod] =
    useState<SubmittedPaymentMethod | null>(null);
  const [state, formAction, isPending] = useActionState(
    createCheckoutAction,
    {} as CheckoutActionState,
  );
  const openedPaddleTransactionRef = useRef<string | null>(null);
  const cardFormRef = useRef<HTMLFormElement>(null);
  const isPH = region === "PH";
  const cardCurrency: BillingCurrency = "USD";
  const qrCurrency: BillingCurrency = "PHP";
  const cardPrice = getPlanPrice(plan, cardCurrency, interval);
  const qrPrice = getPlanPrice(plan, qrCurrency, interval);
  const PlanIcon = plan === "pro" ? Briefcase : Building2;
  const intervalLabel = interval === "yearly" ? "Yearly" : "Monthly";

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
        setSubmittedPaymentMethod(null);
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

    setCachedPendingCheckout(userId, nextPendingCheckout);
    queueMicrotask(() => {
      setPendingQr(toPendingQrData(nextPendingCheckout));
      setActivePaddleTransactionId(null);
      onPaddleTransactionChange?.(null);
      setIsAwaitingPaddleConfirmation(false);
      setSubmittedPaymentMethod(null);
      updateCheckoutError(null);
      setIsCancelingQr(false);
      setView("qr");
    });
  }, [
    onPaddleTransactionChange,
    plan,
    state.qrData,
    updateCheckoutError,
    userId,
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
      setSubmittedPaymentMethod(null);
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
      setSubmittedPaymentMethod(null);
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
      userId,
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
      startTransition(() => {
        router.refresh();
      });
      dispatchRouteProgressComplete();
      return;
    }

    clearCachedPendingCheckout(userId, "paymongo");
    setPendingQr(null);
    setIsCancelingQr(false);
    setView("selection");
    onOpenChange(false);
    startTransition(() => {
      router.refresh();
    });
    dispatchRouteProgressComplete();
  }, [onOpenChange, pendingQr, router, updateCheckoutError, userId]);

  const resetPaddleCheckout = useCallback(() => {
    if (activePaddleTransactionId) {
      paddle.closeCheckout();
    }

    openedPaddleTransactionRef.current = null;
    setActivePaddleTransactionId(null);
    onPaddleTransactionChange?.(null);
    setIsAwaitingPaddleConfirmation(false);
    setSubmittedPaymentMethod(null);
    setView("selection");
    updateCheckoutError(null);
  }, [
    activePaddleTransactionId,
    onPaddleTransactionChange,
    paddle,
    updateCheckoutError,
  ]);

  const handleChangePlan = useCallback(() => {
    resetPaddleCheckout();
    setPendingQr(null);
    onOpenChange(false);
    onChangePlan?.();
  }, [onChangePlan, onOpenChange, resetPaddleCheckout]);

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
        <DialogContent
          className={cn(
            "gap-0 overflow-hidden p-0",
            view === "qr" && pendingQr
              ? "max-w-lg"
              : "max-w-2xl",
          )}
        >
          {view === "qr" && pendingQr ? (
            <>
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <DialogTitle className="text-xl">Scan to pay</DialogTitle>
                <DialogDescription>
                  Scan the QR code with your banking app. You can return to the same QR code while it is active.
                </DialogDescription>
              </DialogHeader>
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
            </>
          ) : (
          <>
            <DialogHeader className="border-b border-border/60 px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background">
                    <PlanIcon
                      className={cn(
                        "size-4",
                        plan === "pro" ? "text-primary" : "text-foreground",
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl">
                      {planMeta[plan].label} Plan ({intervalLabel})
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {businessName ? (
                        <span className="inline-flex max-w-full items-center gap-2">
                          <Layers className="size-3.5 shrink-0" />
                          <span className="truncate">{businessName}</span>
                        </span>
                      ) : (
                        "Complete your business upgrade."
                      )}
                    </DialogDescription>
                  </div>
                </div>
                {onChangePlan ? (
                  <Button
                    className="h-auto shrink-0 px-0"
                    onClick={handleChangePlan}
                    size="sm"
                    type="button"
                    variant="link"
                  >
                    Change plan
                  </Button>
                ) : null}
              </div>
            </DialogHeader>

            <DialogBody className="max-h-[72vh] overflow-y-auto p-0">
              <div className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6">
                {/* Paddle inline frame */}
                <div className="flex min-h-[28rem] items-center justify-center rounded-xl border border-border/70 bg-background/80 p-3">
                  {view === "paddle" ? (
                    activePaddleTransactionId ? (
                      <div className="w-full">
                        <div className={PADDLE_FRAME_TARGET} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <Spinner aria-hidden="true" className="size-8" />
                        <p className="text-sm text-muted-foreground">
                          Restoring your checkout session.
                        </p>
                      </div>
                    )
                  ) : isPending && submittedPaymentMethod === "card" ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <Spinner aria-hidden="true" className="size-8" />
                      <p className="text-sm text-muted-foreground">
                        Preparing checkout...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="flex size-12 items-center justify-center rounded-xl border border-border/70 bg-card">
                        <CreditCard className="size-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Secure card form opens here.
                      </p>
                    </div>
                  )}
                </div>

                {/* Card checkout form */}
                {view === "selection" ? (
                  <form
                    ref={cardFormRef}
                    action={formAction}
                    onSubmit={() => setSubmittedPaymentMethod("card")}
                  >
                    <input name="businessId" type="hidden" value={businessId} />
                    <input name="plan" type="hidden" value={plan} />
                    <input name="currency" type="hidden" value={cardCurrency} />
                    <input name="interval" type="hidden" value={interval} />
                    <Button
                      className="w-full"
                      disabled={isPending}
                      size="lg"
                      type="submit"
                    >
                      {isPending && submittedPaymentMethod === "card" ? (
                        <>
                          <Spinner aria-hidden="true" />
                          Preparing checkout...
                        </>
                      ) : (
                        <>
                          <CreditCard data-icon="inline-start" />
                          Pay with Card
                          <span className="ml-1 opacity-70">
                            — {formatPrice(cardPrice, cardCurrency)}
                          </span>
                        </>
                      )}
                    </Button>
                  </form>
                ) : null}

                {/* QR Ph option — PH region only */}
                {isPH && view === "selection" ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>
                    <form
                      action={formAction}
                      onSubmit={() => setSubmittedPaymentMethod("qrph")}
                    >
                      <input name="businessId" type="hidden" value={businessId} />
                      <input name="plan" type="hidden" value={plan} />
                      <input name="currency" type="hidden" value={qrCurrency} />
                      <input name="interval" type="hidden" value={interval} />
                      <Button
                        className="w-full"
                        disabled={isPending}
                        size="lg"
                        type="submit"
                        variant="outline"
                      >
                        {isPending && submittedPaymentMethod === "qrph" ? (
                          <>
                            <Spinner aria-hidden="true" />
                            Preparing QRPh...
                          </>
                        ) : (
                          <>
                            <QrCode data-icon="inline-start" />
                            Pay with QRPh
                            <span className="ml-1 opacity-70">
                              — {formatPrice(qrPrice, qrCurrency)}
                            </span>
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                ) : null}

                {resolvedCheckoutError ? (
                  <Alert variant="destructive">
                    <AlertCircle />
                    <AlertTitle>Payment issue</AlertTitle>
                    <AlertDescription>{resolvedCheckoutError}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </DialogBody>
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
              {planMeta[plan].label} business access
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
          Your account will upgrade once PayMongo confirms the payment.
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
