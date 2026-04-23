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
  Crown,
  QrCode,
  ShoppingCart,
  Wallet,
  Zap,
} from "lucide-react";
import QRCode from "react-qr-code";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
  cleanupExpiredPendingAction,
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
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type ControlledCheckoutDialogProps = CheckoutDialogProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PaymentMethod = "qrph" | "card";
type CheckoutView = "selection" | "qr" | "paddle" | "processing";

type WorkspaceSubscriptionRealtimeRow = {
  plan?: string | null;
  status?: string | null;
};

type PaymentAttemptRealtimeRow = {
  provider_payment_id?: string | null;
  status?: string | null;
};

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
const PENDING_QR_KEY = "requo:pending-qrph";
const PROCESSING_RELOAD_DELAY_MS = 1200;
const isDevelopment = process.env.NODE_ENV === "development";

function getCachedPendingQr(
  workspaceId: string,
  plan: PaidPlan,
): PendingQrPhData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(`${PENDING_QR_KEY}:${workspaceId}`);

    if (!raw) {
      return null;
    }

    const data = JSON.parse(raw) as PendingQrPhData;

    if (data.plan !== plan) {
      return null;
    }

    if (new Date(data.expiresAt) <= new Date()) {
      window.sessionStorage.removeItem(`${PENDING_QR_KEY}:${workspaceId}`);
      window.sessionStorage.setItem(
        `${PENDING_QR_KEY}:expired:${workspaceId}`,
        "1",
      );
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setCachedPendingQr(workspaceId: string, data: PendingQrPhData): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      `${PENDING_QR_KEY}:${workspaceId}`,
      JSON.stringify(data),
    );
  } catch {
    // Ignore unavailable or full storage.
  }
}

export function clearCachedPendingQr(workspaceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(`${PENDING_QR_KEY}:${workspaceId}`);
  } catch {
    // Ignore unavailable storage.
  }
}

async function fetchRealtimeToken() {
  const response = await fetch("/api/business/notifications/realtime-token", {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as {
    expiresAt: string;
    token: string;
  };
}

export function CheckoutDialog(props: ControlledCheckoutDialogProps) {
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const environment = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "sandbox") as
    | "sandbox"
    | "production";

  const dialog = (
    <CheckoutDialogInner
      key={`${props.workspaceId}:${props.plan}:${props.open ? "open" : "closed"}`}
      {...props}
    />
  );

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
}: ControlledCheckoutDialogProps) {
  const router = useRouter();
  const paddle = usePaddle();
  const initialPendingQr = getCachedPendingQr(workspaceId, plan);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    initialPendingQr ? "qrph" : region === "PH" ? "qrph" : "card",
  );
  const [view, setView] = useState<CheckoutView>(
    initialPendingQr ? "qr" : "selection",
  );
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pendingQr, setPendingQr] = useState<PendingQrPhData | null>(
    initialPendingQr,
  );
  const [activePaddleTransactionId, setActivePaddleTransactionId] = useState<
    string | null
  >(null);
  const [completedPaddleTransactionId, setCompletedPaddleTransactionId] =
    useState<string | null>(null);
  const [isCancelingQr, setIsCancelingQr] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createCheckoutAction,
    {} as CheckoutActionState,
  );
  const handledTransactionIdRef = useRef<string | null>(null);
  const qrCancelInFlightRef = useRef(false);
  const reloadTimerRef = useRef<number | null>(null);
  const cleanupFiredRef = useRef(false);
  const isPH = region === "PH";
  const isQrPh = paymentMethod === "qrph";
  const currency: BillingCurrency = isQrPh ? "PHP" : "USD";
  const effectiveInterval: BillingInterval = isQrPh ? "monthly" : interval;
  const totalPrice = getPlanPrice(plan, currency, effectiveInterval);
  const savingsPercent = getYearlySavingsPercent(plan, currency);
  const PlanIcon = plan === "pro" ? Zap : Crown;

  const scheduleReload = useCallback(() => {
    if (typeof window === "undefined" || reloadTimerRef.current) {
      return;
    }

    reloadTimerRef.current = window.setTimeout(() => {
      window.location.reload();
    }, PROCESSING_RELOAD_DELAY_MS);
  }, []);

  const handleCheckoutSuccess = useCallback(() => {
    clearCachedPendingQr(workspaceId);
    setPendingQr(null);
    setCheckoutError(null);
    setIsCancelingQr(false);
    setView("processing");
    scheduleReload();
  }, [scheduleReload, workspaceId]);

  const handleQrFailure = useCallback(
    (message: string) => {
      if (qrCancelInFlightRef.current) {
        return;
      }

      clearCachedPendingQr(workspaceId);
      setPendingQr(null);
      setIsCancelingQr(false);
      setCheckoutError(message);
      setView("selection");
    },
    [workspaceId],
  );

  const handlePaddleFailure = useCallback((message: string) => {
    setActivePaddleTransactionId(null);
    setCompletedPaddleTransactionId(null);
    setCheckoutError(message);
    setView("selection");
  }, []);

  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!state.qrData) {
      return;
    }

    const nextPendingQr: PendingQrPhData = {
      amount: state.qrData.amount,
      currency: "PHP",
      expiresAt: state.qrData.expiresAt,
      paymentIntentId: state.qrData.paymentIntentId,
      plan,
      qrCodeData: state.qrData.qrCodeData,
    };

    setCachedPendingQr(workspaceId, nextPendingQr);

    queueMicrotask(() => {
      setPendingQr(nextPendingQr);
      setCheckoutError(null);
      setIsCancelingQr(false);
      setView("qr");
    });
  }, [plan, state.qrData, workspaceId]);

  useEffect(() => {
    if (!state.error) {
      return;
    }

    queueMicrotask(() => {
      setCheckoutError(state.error!);
      setIsCancelingQr(false);
      setView("selection");
    });
  }, [state.error]);

  useEffect(() => {
    if (
      !state.paddleTransactionId ||
      !paddle.isReady ||
      handledTransactionIdRef.current === state.paddleTransactionId
    ) {
      return;
    }

    const transactionId = state.paddleTransactionId;

    handledTransactionIdRef.current = transactionId;
    queueMicrotask(() => {
      setCheckoutError(null);
      setActivePaddleTransactionId(transactionId);
      setCompletedPaddleTransactionId(null);
      setView("paddle");
    });

    requestAnimationFrame(() => {
      paddle.openCheckout(
        transactionId,
        {
          onClose: () => {
            setActivePaddleTransactionId(null);
            setView("selection");
          },
          onComplete: () => {
            setCompletedPaddleTransactionId(transactionId);
            setView("processing");
          },
          onError: (message) => {
            setActivePaddleTransactionId(null);
            setCompletedPaddleTransactionId(null);
            setCheckoutError(message);
            setView("selection");
          },
          onPaymentFailed: (message) => {
            paddle.closeCheckout();
            setActivePaddleTransactionId(null);
            setCompletedPaddleTransactionId(null);
            setCheckoutError(message);
            setView("selection");
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
  }, [paddle, state.paddleTransactionId]);

  useEffect(() => {
    if (cleanupFiredRef.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const expiredKey = `${PENDING_QR_KEY}:expired:${workspaceId}`;

    if (!window.sessionStorage.getItem(expiredKey)) {
      return;
    }

    window.sessionStorage.removeItem(expiredKey);
    cleanupFiredRef.current = true;
    void cleanupExpiredPendingAction(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    const shouldMonitorQr = open && Boolean(pendingQr) && view === "qr";
    const shouldMonitorPaddle = open && Boolean(completedPaddleTransactionId);

    if (!shouldMonitorQr && !shouldMonitorPaddle) {
      return;
    }

    let isActive = true;
    const supabase = createSupabaseBrowserClient();
    let refreshTimerId: number | null = null;
    let subscriptionChannel:
      | Awaited<ReturnType<typeof supabase.channel>>
      | null = null;
    let paymentAttemptsChannel:
      | Awaited<ReturnType<typeof supabase.channel>>
      | null = null;

    function clearRefreshTimer() {
      if (refreshTimerId) {
        clearTimeout(refreshTimerId);
        refreshTimerId = null;
      }
    }

    function scheduleRefresh(expiresAt: string) {
      clearRefreshTimer();
      const refreshInMs = Math.max(
        new Date(expiresAt).getTime() - Date.now() - 60_000,
        30_000,
      );

      refreshTimerId = window.setTimeout(() => {
        void refreshRealtimeAuth();
      }, refreshInMs);
    }

    async function refreshRealtimeAuth() {
      const nextToken = await fetchRealtimeToken();

      if (!nextToken || !isActive) {
        return;
      }

      await supabase.realtime.setAuth(nextToken.token);
      scheduleRefresh(nextToken.expiresAt);
    }

    function handleSubscriptionRow(row: WorkspaceSubscriptionRealtimeRow) {
      const status = row.status;
      const rowPlan = row.plan;

      if (status === "active" && rowPlan === plan) {
        handleCheckoutSuccess();
        return;
      }

      if (!shouldMonitorQr) {
        return;
      }

      if (
        status === "expired" ||
        status === "incomplete" ||
        status === "canceled" ||
        status === "free"
      ) {
        const message =
          status === "expired"
            ? "This QR Ph payment expired. Generate a new QR code to try again."
            : "QR Ph payment failed. Please try again.";

        handleQrFailure(message);
      }
    }

    function handlePaymentAttemptRow(row: PaymentAttemptRealtimeRow) {
      if (
        !shouldMonitorPaddle ||
        row.provider_payment_id !== completedPaddleTransactionId
      ) {
        return;
      }

      if (row.status === "failed") {
        handlePaddleFailure("Payment failed. Please try again.");
      }
    }

    async function checkSubscriptionStatus() {
      const { data: subscriptionData } = await supabase
        .from("workspace_subscriptions")
        .select("plan, status")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (subscriptionData && isActive) {
        handleSubscriptionRow(subscriptionData);
      }
    }

    async function checkPaymentAttemptStatus() {
      if (!shouldMonitorPaddle || !completedPaddleTransactionId) {
        return;
      }

      const { data: paymentAttempts } = await supabase
        .from("payment_attempts")
        .select("provider_payment_id, status")
        .eq("provider_payment_id", completedPaddleTransactionId)
        .order("created_at", { ascending: false })
        .limit(1);

      const latestAttempt = paymentAttempts?.[0];

      if (latestAttempt && isActive) {
        handlePaymentAttemptRow(latestAttempt);
      }
    }

    async function connectRealtime() {
      const tokenData = await fetchRealtimeToken();

      if (!tokenData || !isActive) {
        return;
      }

      await supabase.realtime.setAuth(tokenData.token);

      subscriptionChannel = supabase
        .channel(`workspace-subscription:${workspaceId}:${plan}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            filter: `workspace_id=eq.${workspaceId}`,
            schema: "public",
            table: "workspace_subscriptions",
          },
          (payload) => {
            handleSubscriptionRow(
              payload.new as WorkspaceSubscriptionRealtimeRow,
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            filter: `workspace_id=eq.${workspaceId}`,
            schema: "public",
            table: "workspace_subscriptions",
          },
          (payload) => {
            handleSubscriptionRow(
              payload.new as WorkspaceSubscriptionRealtimeRow,
            );
          },
        )
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && isActive) {
            await checkSubscriptionStatus();
          }
        });

      if (shouldMonitorPaddle && completedPaddleTransactionId) {
        paymentAttemptsChannel = supabase
          .channel(`payment-attempt:${completedPaddleTransactionId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              filter: `provider_payment_id=eq.${completedPaddleTransactionId}`,
              schema: "public",
              table: "payment_attempts",
            },
            (payload) => {
              handlePaymentAttemptRow(payload.new as PaymentAttemptRealtimeRow);
            },
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              filter: `provider_payment_id=eq.${completedPaddleTransactionId}`,
              schema: "public",
              table: "payment_attempts",
            },
            (payload) => {
              handlePaymentAttemptRow(payload.new as PaymentAttemptRealtimeRow);
            },
          )
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED" && isActive) {
              await checkPaymentAttemptStatus();
            }
          });
      }

      scheduleRefresh(tokenData.expiresAt);
    }

    void connectRealtime();

    return () => {
      isActive = false;
      clearRefreshTimer();

      if (subscriptionChannel) {
        void supabase.removeChannel(subscriptionChannel);
      }

      if (paymentAttemptsChannel) {
        void supabase.removeChannel(paymentAttemptsChannel);
      }
    };
  }, [
    completedPaddleTransactionId,
    handleCheckoutSuccess,
    handlePaddleFailure,
    handleQrFailure,
    open,
    pendingQr,
    plan,
    view,
    workspaceId,
  ]);

  const handleQrClose = useCallback(async () => {
    if (!pendingQr || qrCancelInFlightRef.current) {
      return;
    }

    qrCancelInFlightRef.current = true;
    setIsCancelingQr(true);
    setCheckoutError(null);

    const result = await cancelPendingQrCheckoutAction(
      workspaceId,
      pendingQr.paymentIntentId,
    );

    if (!result.ok) {
      qrCancelInFlightRef.current = false;
      setIsCancelingQr(false);
      setCheckoutError(result.error);
      return;
    }

    if (result.outcome === "already_paid") {
      qrCancelInFlightRef.current = false;
      handleCheckoutSuccess();
      return;
    }

    clearCachedPendingQr(workspaceId);
    qrCancelInFlightRef.current = false;
    setPendingQr(null);
    setIsCancelingQr(false);
    onOpenChange(false);
    router.refresh();
  }, [handleCheckoutSuccess, onOpenChange, pendingQr, router, workspaceId]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }

      if (isPending || view === "processing") {
        return;
      }

      if (pendingQr) {
        void handleQrClose();
        return;
      }

      if (view === "paddle" || activePaddleTransactionId) {
        paddle.closeCheckout();
      }

      onOpenChange(false);
    },
    [
      activePaddleTransactionId,
      handleQrClose,
      isPending,
      onOpenChange,
      paddle,
      pendingQr,
      view,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden p-0"
        showCloseButton={view !== "processing"}
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="px-2 text-xl">
            {view === "processing"
              ? "Processing your payment"
              : view === "paddle"
                ? "Complete your payment"
                : view === "qr"
                  ? "Scan to pay"
                  : `Upgrade to ${planMeta[plan].label}`}
          </DialogTitle>
          <DialogDescription className="px-2">
            {view === "processing"
              ? "We are confirming your payment and activating your workspace."
              : view === "paddle"
                ? "Finish the payment in the inline checkout below."
                : view === "qr"
                  ? "Scan the QR code with your banking app. Closing this dialog will stop the pending QR checkout."
                  : "Choose how you want to pay for this plan upgrade."}
          </DialogDescription>
        </DialogHeader>

        {view === "processing" ? (
          <DialogBody className="flex flex-col items-center gap-4 py-10">
            <Spinner aria-hidden="true" className="size-8" />
            <p className="text-center text-sm text-muted-foreground">
              Activating {planMeta[plan].label} for this workspace.
            </p>
          </DialogBody>
        ) : view === "paddle" && activePaddleTransactionId ? (
          <DialogBody className="overflow-y-auto p-0">
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
          </DialogBody>
        ) : view === "qr" && pendingQr ? (
          <DialogBody className="overflow-y-auto pb-6">
            <QrPhPaymentView
              error={checkoutError}
              isCanceling={isCancelingQr}
              onClose={() => {
                void handleQrClose();
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
                            ? "fill-current text-primary"
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
                        onClick={() => setPaymentMethod("qrph")}
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
                      onClick={() => setPaymentMethod("card")}
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

                {checkoutError ? (
                  <Alert variant="destructive">
                    <AlertCircle />
                    <AlertTitle>Payment issue</AlertTitle>
                    <AlertDescription>{checkoutError}</AlertDescription>
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
  );
}

function QrPhPaymentView({
  error,
  isCanceling,
  onClose,
  plan,
  qrData,
}: {
  error: string | null;
  isCanceling: boolean;
  onClose: () => void;
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

      <Button className="w-full" onClick={onClose} type="button" variant="outline">
        {isCanceling ? (
          <>
            <Spinner aria-hidden="true" />
            Stopping pending checkout...
          </>
        ) : (
          <>
            <QrCode data-icon="inline-start" />
            Stop pending checkout
          </>
        )}
      </Button>
    </div>
  );
}
