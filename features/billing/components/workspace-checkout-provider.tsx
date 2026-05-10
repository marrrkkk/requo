"use client";

import {
  createContext,
  Suspense,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { dispatchRouteProgressComplete } from "@/lib/navigation/route-progress";
import { Briefcase, Building2, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
import {
  cleanupExpiredPendingAction,
  getCheckoutStatusAction,
  getPendingCheckoutAction,
} from "@/features/billing/actions";
import { PlanSelectionSheet } from "@/features/billing/components/plan-selection-sheet";
import {
  clearCachedPendingCheckout,
  getCachedPendingCheckout,
  setCachedPendingCheckout,
  subscribeToPendingCheckout,
  type PersistedPendingCheckout,
} from "@/features/billing/pending-checkout";
import type {
  PendingCheckoutState,
  AccountBillingOverview,
} from "@/features/billing/types";
import { planMeta } from "@/lib/plans";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

type SupabaseBrowserClient = ReturnType<
  typeof import("@/lib/supabase/browser").createSupabaseBrowserClient
>;
type RealtimeChannel = ReturnType<SupabaseBrowserClient["channel"]>;

const CheckoutDialog = dynamic(() =>
  import("@/features/billing/components/checkout-dialog").then(
    (module) => module.CheckoutDialog,
  ),
);

const planUpgradeHighlights: Record<PaidPlan, string[]> = {
  pro: [
    "Unlimited inquiries and quotes",
    "Multiple inquiry forms",
    "AI assistant and knowledge base",
    "Data exports and custom branding",
    "Multiple businesses",
  ],
  business: [
    "Everything in Pro, plus",
    "Team members and roles",
    "Priority support",
    "Unlimited businesses",
    "Highest limits across the board",
  ],
};

type BusinessCheckoutContextValue = {
  currentPlan: plan;
  defaultCurrency: AccountBillingOverview["defaultCurrency"];
  pendingCheckout: PersistedPendingCheckout | null;
  region: AccountBillingOverview["region"];
  userId: string;
  businessId: string;
  businessSlug: string;
  openPlanSelection: (targetPlan?: PaidPlan) => void;
  openCheckout: (plan: PaidPlan, interval?: BillingInterval) => void;
  continueCheckout: () => void;
};

type BusinessSubscriptionRealtimeRow = {
  effectivePlan?: string | null;
  plan?: string | null;
  status?: string | null;
};

type PaymentAttemptRealtimeRow = {
  provider_payment_id?: string | null;
  status?: string | null;
};

type ProcessingState = {
  awaitingActivation: boolean;
  plan: PaidPlan;
};

type ActivePaddleCheckout = {
  plan: PaidPlan;
  transactionId: string;
};

const BusinessCheckoutContext =
  createContext<BusinessCheckoutContextValue | null>(null);
const CHECKOUT_STATUS_POLL_INTERVAL_MS = 2500;
const PROCESSING_REFRESH_DELAY_MS = 250;
const PROCESSING_REFRESH_RETRY_MS = 3000;
const PROCESSING_FALLBACK_MS = 15000;
const PLAN_OVERRIDE_STORAGE_KEY = "requo.planOverrides";
const PLAN_OVERRIDE_TTL_MS = 10 * 60 * 1000;

type PersistedPlanOverride = {
  expiresAt: number;
  plan: plan;
};

const planRank: Record<plan, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

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
function normalizePendingCheckout(
  checkout: PendingCheckoutState,
): PersistedPendingCheckout {
  return {
    amount: checkout.amount,
    currency: "PHP",
    expiresAt: checkout.expiresAt,
    paymentIntentId: checkout.paymentIntentId,
    plan: checkout.plan,
    provider: "paymongo",
    qrCodeData: checkout.qrCodeData,
  };
}

function getPendingCheckoutFailureMessage(
  checkout: PersistedPendingCheckout,
  status?: string | null,
) {
  return status === "expired"
    ? "This QR Ph payment expired. Generate a new QR code to try again."
    : "QR Ph payment failed. Please try again.";
}

function isplan(value: unknown): value is plan {
  return value === "free" || value === "pro" || value === "business";
}

function readPersistedPlanOverride(businessId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(PLAN_OVERRIDE_STORAGE_KEY);
    const overrides = rawValue
      ? (JSON.parse(rawValue) as Record<string, PersistedPlanOverride>)
      : {};
    const override = overrides[businessId];

    if (!override || !isplan(override.plan)) {
      return null;
    }

    if (override.expiresAt <= Date.now()) {
      delete overrides[businessId];
      window.localStorage.setItem(
        PLAN_OVERRIDE_STORAGE_KEY,
        JSON.stringify(overrides),
      );
      return null;
    }

    return override.plan;
  } catch {
    return null;
  }
}

function persistPlanOverride(businessId: string, plan: plan) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const rawValue = window.localStorage.getItem(PLAN_OVERRIDE_STORAGE_KEY);
    const overrides = rawValue
      ? (JSON.parse(rawValue) as Record<string, PersistedPlanOverride>)
      : {};

    overrides[businessId] = {
      expiresAt: Date.now() + PLAN_OVERRIDE_TTL_MS,
      plan,
    };

    window.localStorage.setItem(
      PLAN_OVERRIDE_STORAGE_KEY,
      JSON.stringify(overrides),
    );
  } catch {
    // Ignore storage failures; the in-memory plan state still updates instantly.
  }
}

function clearPersistedPlanOverride(businessId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const rawValue = window.localStorage.getItem(PLAN_OVERRIDE_STORAGE_KEY);
    const overrides = rawValue
      ? (JSON.parse(rawValue) as Record<string, PersistedPlanOverride>)
      : {};

    if (!overrides[businessId]) {
      return;
    }

    delete overrides[businessId];
    window.localStorage.setItem(
      PLAN_OVERRIDE_STORAGE_KEY,
      JSON.stringify(overrides),
    );
  } catch {
    // Ignore storage failures; overrides are only a short-lived UX hint.
  }
}

export function useBusinessCheckout() {
  return useContext(BusinessCheckoutContext);
}

export function BusinessCheckoutProvider({
  billing,
  children,
}: {
  billing: AccountBillingOverview;
  children: ReactNode;
}) {
  const router = useRouter();
  const userId = billing.userId;
  const businessId = billing.businessId;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const [targetPlan, setTargetPlan] = useState<PaidPlan | undefined>(undefined);
  const [pendingCheckout, setPendingCheckout] = useState<PersistedPendingCheckout | null>(null);
  const [activePaddleCheckout, setActivePaddleCheckout] = useState<ActivePaddleCheckout | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState | null>(
    null,
  );
  const [currentPlan, setCurrentPlan] = useState<plan>(
    billing.currentPlan,
  );
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [successPlan, setSuccessPlan] = useState<PaidPlan | null>(null);
  const refreshQueuedRef = useRef(false);
  const localExpiryHandledRef = useRef<string | null>(null);
  const pendingCheckoutVersionRef = useRef(0);
  const checkoutKeyRef = useRef(0);
  const activationFallbackTimerRef = useRef<number | null>(null);
  const confirmedActivationPlanRef = useRef<PaidPlan | null>(null);
  const supabaseRef = useRef<SupabaseBrowserClient | null>(null);

  const openPlanSelection = useCallback((nextTargetPlan?: PaidPlan) => {
    setCheckoutError(null);
    setTargetPlan(nextTargetPlan);
    setSheetOpen(true);
  }, []);

  const openCheckout = useCallback((plan: PaidPlan, interval?: BillingInterval) => {
    checkoutKeyRef.current += 1;
    setCheckoutError(null);
    setSheetOpen(false);
    setSelectedPlan(plan);
    setSelectedInterval(interval ?? "monthly");
    setCheckoutOpen(true);
  }, []);

  const changeCheckoutPlan = useCallback(() => {
    checkoutKeyRef.current += 1;
    setCheckoutError(null);
    setCheckoutOpen(false);
    setSelectedPlan(null);
    setSheetOpen(true);
  }, []);

  const continueCheckout = useCallback(() => {
    if (!pendingCheckout) {
      return;
    }

    checkoutKeyRef.current += 1;
    setCheckoutError(null);
    setSelectedPlan(pendingCheckout.plan);
    setCheckoutOpen(true);
  }, [pendingCheckout]);

  const beginCheckoutProcessing = useCallback((plan: PaidPlan) => {
    setCheckoutError(null);
    setCheckoutOpen(false);
    setSelectedPlan(plan);
    setProcessingState({ awaitingActivation: true, plan });
  }, []);

  const confirmplan = useCallback(
    (plan: plan) => {
      setCurrentPlan(plan);
      persistPlanOverride(businessId, plan);
    },
    [businessId],
  );

  const queueRefresh = useCallback(() => {
    if (refreshQueuedRef.current) {
      return;
    }

    refreshQueuedRef.current = true;

    window.setTimeout(() => {
      startTransition(() => {
        router.refresh();
      });
      dispatchRouteProgressComplete();
      window.setTimeout(() => {
        refreshQueuedRef.current = false;
      }, PROCESSING_REFRESH_RETRY_MS);
    }, PROCESSING_REFRESH_DELAY_MS);
  }, [router]);

  const clearActivationFallback = useCallback(() => {
    if (activationFallbackTimerRef.current) {
      window.clearTimeout(activationFallbackTimerRef.current);
      activationFallbackTimerRef.current = null;
    }

    confirmedActivationPlanRef.current = null;
  }, []);

  const scheduleActivationFallback = useCallback(
    (plan: PaidPlan) => {
      confirmedActivationPlanRef.current = plan;

      if (activationFallbackTimerRef.current) {
        return;
      }

      activationFallbackTimerRef.current = window.setTimeout(() => {
        activationFallbackTimerRef.current = null;

        if (confirmedActivationPlanRef.current !== plan) {
          return;
        }

        refreshQueuedRef.current = false;
        setProcessingState(null);
        setCheckoutOpen(false);
        setCheckoutError(null);
        setSelectedPlan(null);
        setSuccessPlan(plan);
        startTransition(() => {
          router.refresh();
        });
        dispatchRouteProgressComplete();
      }, PROCESSING_FALLBACK_MS);
    },
    [router],
  );

  const handleCheckoutFailure = useCallback(
    (message: string, failedCheckout: PersistedPendingCheckout | null) => {
      clearActivationFallback();
      clearCachedPendingCheckout(userId);
      setProcessingState(null);
      setSelectedPlan(failedCheckout?.plan ?? selectedPlan);
      setCheckoutError(message);

      if (!checkoutOpen) {
        toast.error(message);
      }
    },
    [checkoutOpen, clearActivationFallback, selectedPlan, userId],
  );

  useEffect(() => {
    return clearActivationFallback;
  }, [clearActivationFallback]);

  useEffect(() => {
    const persistedPlan = readPersistedPlanOverride(userId);

    if (
      persistedPlan &&
      planRank[persistedPlan] > planRank[billing.currentPlan]
    ) {
      setCurrentPlan(persistedPlan);
      return;
    }

    setCurrentPlan(billing.currentPlan);

    if (persistedPlan) {
      clearPersistedPlanOverride(userId);
    }
  }, [billing.currentPlan, userId]);

  useEffect(() => {
    const initialCachedCheckout = getCachedPendingCheckout(userId);

    if (initialCachedCheckout) {
      pendingCheckoutVersionRef.current += 1;
      setPendingCheckout(initialCachedCheckout);
    }

    return subscribeToPendingCheckout(userId, (nextCheckout) => {
      pendingCheckoutVersionRef.current += 1;
      setPendingCheckout(nextCheckout);
    });
  }, [userId]);

  useEffect(() => {
    let isActive = true;
    const recoveryVersion = pendingCheckoutVersionRef.current;

    async function recoverPendingCheckout() {
      const recovered = await getPendingCheckoutAction(userId);

      if (!isActive) {
        return;
      }

      if (pendingCheckoutVersionRef.current !== recoveryVersion) {
        return;
      }

      if (!recovered) {
        clearCachedPendingCheckout(userId);
        return;
      }

      const normalizedCheckout = normalizePendingCheckout(recovered);
      setSelectedPlan((currentPlan) => currentPlan ?? normalizedCheckout.plan);
      setCachedPendingCheckout(userId, normalizedCheckout);
    }

    void recoverPendingCheckout();

    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!pendingCheckout || pendingCheckout.provider !== "paymongo") {
      localExpiryHandledRef.current = null;
      return;
    }

    const expiresInMs =
      new Date(pendingCheckout.expiresAt).getTime() - Date.now();

    const handleExpiry = () => {
      if (localExpiryHandledRef.current === pendingCheckout.paymentIntentId) {
        return;
      }

      localExpiryHandledRef.current = pendingCheckout.paymentIntentId;
      handleCheckoutFailure(
        "This QR Ph payment expired. Generate a new QR code to try again.",
        pendingCheckout,
      );
      void cleanupExpiredPendingAction(userId);
    };

    if (expiresInMs <= 0) {
      handleExpiry();
      return;
    }

    const timer = window.setTimeout(handleExpiry, expiresInMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [handleCheckoutFailure, pendingCheckout, userId]);

  useEffect(() => {
    const activeStatus = billing.subscription?.status;
    const activePlan = billing.currentPlan;

    if (
      !processingState ||
      (activeStatus !== "active" && activeStatus !== "past_due") ||
      activePlan !== processingState.plan
    ) {
      return;
    }

    clearCachedPendingCheckout(userId);
    clearActivationFallback();
    refreshQueuedRef.current = false;
    const upgradedPlan = processingState.plan;
    confirmplan(upgradedPlan);
    queueMicrotask(() => {
      setProcessingState(null);
      setCheckoutOpen(false);
      setCheckoutError(null);
      setSelectedPlan(null);
      setSuccessPlan(upgradedPlan);
    });
  }, [
    billing.currentPlan,
    billing.subscription?.status,
    clearActivationFallback,
    confirmplan,
    processingState,
    userId,
  ]);

  useEffect(() => {
    const shouldMonitorRealtime = Boolean(
      pendingCheckout || activePaddleCheckout || processingState,
    );

    if (!shouldMonitorRealtime) {
      return;
    }

    let isActive = true;
    // Unique suffix prevents collisions when the effect re-runs before the
    // previous cleanup's `removeChannel` fully completes (async race).
    const channelSuffix = Date.now();
    let refreshTimerId: number | null = null;
    let statusPollTimerId: number | null = null;
    let subscriptionChannel: RealtimeChannel | null = null;
    let paymentAttemptsChannel: RealtimeChannel | null = null;
    let isSyncingCheckoutStatus = false;

    const planToTrack =
      pendingCheckout?.plan ??
      activePaddleCheckout?.plan ??
      processingState?.plan ??
      null;
    const trackedPaymentAttemptId =
      pendingCheckout?.paymentIntentId ??
      activePaddleCheckout?.transactionId ??
      null;

    function clearRefreshTimer() {
      if (refreshTimerId) {
        window.clearTimeout(refreshTimerId);
        refreshTimerId = null;
      }
    }

    function clearStatusPollTimer() {
      if (statusPollTimerId) {
        window.clearInterval(statusPollTimerId);
        statusPollTimerId = null;
      }
    }

    function scheduleAuthRefresh(expiresAt: string) {
      clearRefreshTimer();

      const refreshInMs = Math.max(
        new Date(expiresAt).getTime() - Date.now() - 60_000,
        30_000,
      );

      refreshTimerId = window.setTimeout(() => {
        void refreshRealtimeAuth();
      }, refreshInMs);
    }

    async function getSupabase() {
      if (supabaseRef.current) {
        return supabaseRef.current;
      }

      const { createSupabaseBrowserClient } = await import(
        "@/lib/supabase/browser"
      );
      const nextClient = createSupabaseBrowserClient();
      supabaseRef.current = nextClient;
      return nextClient;
    }

    async function refreshRealtimeAuth() {
      const nextToken = await fetchRealtimeToken();

      if (!nextToken || !isActive) {
        return;
      }

      const supabase = await getSupabase();

      if (!isActive) {
        return;
      }

      await supabase.realtime.setAuth(nextToken.token);
      scheduleAuthRefresh(nextToken.expiresAt);
    }

    function beginProcessing(plan: PaidPlan, awaitingActivation: boolean) {
      setCheckoutError(null);
      setCheckoutOpen(false);
      setSelectedPlan(plan);
      setProcessingState((currentState) => {
        if (
          currentState &&
          currentState.plan === plan &&
          currentState.awaitingActivation === awaitingActivation
        ) {
          return currentState;
        }

        return { awaitingActivation, plan };
      });
    }

    function handleSubscriptionRow(row: BusinessSubscriptionRealtimeRow) {
      const status = row.status;
      const effectivePlan = row.effectivePlan;
      const rowPlan = row.plan;

      if (
        planToTrack &&
        (rowPlan === planToTrack || effectivePlan === planToTrack) &&
        (status === "active" || status === "past_due")
      ) {
        confirmplan(planToTrack);
        beginProcessing(planToTrack, false);
        clearCachedPendingCheckout(userId);
        scheduleActivationFallback(planToTrack);
        queueRefresh();
        return;
      }

      if (!pendingCheckout) {
        return;
      }

      if (
        (status === "expired" ||
          status === "incomplete" ||
          status === "canceled" ||
          status === "free")
      ) {
        handleCheckoutFailure(
          getPendingCheckoutFailureMessage(pendingCheckout, status),
          pendingCheckout,
        );
      }
    }

    function handlePaymentAttemptRow(row: PaymentAttemptRealtimeRow) {
      if (!trackedPaymentAttemptId) {
        return;
      }

      if (row.provider_payment_id !== trackedPaymentAttemptId) {
        return;
      }

      if (row.status === "succeeded") {
        if (pendingCheckout) {
          beginProcessing(pendingCheckout.plan, true);
          clearCachedPendingCheckout(userId);
          return;
        }

        if (activePaddleCheckout) {
          beginProcessing(activePaddleCheckout.plan, true);
          setActivePaddleCheckout(null);
        }

        return;
      }

      if (!pendingCheckout) {
        return;
      }

      if (row.status === "failed" || row.status === "expired") {
        handleCheckoutFailure(
          getPendingCheckoutFailureMessage(pendingCheckout, row.status),
          pendingCheckout,
        );
      }
    }

    async function syncCheckoutStatus() {
      if (isSyncingCheckoutStatus) {
        return;
      }

      isSyncingCheckoutStatus = true;

      try {
        const snapshot = await getCheckoutStatusAction(
          userId,
          trackedPaymentAttemptId,
        );

        if (!snapshot || !isActive) {
          return;
        }

        if (snapshot.paymentAttempt) {
          handlePaymentAttemptRow({
            provider_payment_id: snapshot.paymentAttempt.providerPaymentId,
            status: snapshot.paymentAttempt.status,
          });
        }

        if (snapshot.subscription) {
          handleSubscriptionRow(snapshot.subscription);
        }
      } finally {
        isSyncingCheckoutStatus = false;
      }
    }

    void syncCheckoutStatus();
    statusPollTimerId = window.setInterval(() => {
      void syncCheckoutStatus();
    }, CHECKOUT_STATUS_POLL_INTERVAL_MS);

    async function connectRealtime() {
      const tokenData = await fetchRealtimeToken();

      if (!tokenData || !isActive) {
        return;
      }

      const supabase = await getSupabase();

      if (!isActive) {
        return;
      }

      await supabase.realtime.setAuth(tokenData.token);

      subscriptionChannel = supabase
        .channel(`account-subscription:${userId}:${planToTrack ?? "any"}:${channelSuffix}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            filter: `user_id=eq.${userId}`,
            schema: "public",
            table: "account_subscriptions",
          },
          (payload) => {
            handleSubscriptionRow(payload.new as BusinessSubscriptionRealtimeRow);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            filter: `user_id=eq.${userId}`,
            schema: "public",
            table: "account_subscriptions",
          },
          (payload) => {
            handleSubscriptionRow(payload.new as BusinessSubscriptionRealtimeRow);
          },
        )
        .subscribe();

      if (trackedPaymentAttemptId) {
        paymentAttemptsChannel = supabase
          .channel(`payment-attempt:${userId}:${trackedPaymentAttemptId}:${channelSuffix}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              filter: `user_id=eq.${userId}`,
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
              filter: `user_id=eq.${userId}`,
              schema: "public",
              table: "payment_attempts",
            },
            (payload) => {
              handlePaymentAttemptRow(payload.new as PaymentAttemptRealtimeRow);
            },
          )
          .subscribe();
      }

      scheduleAuthRefresh(tokenData.expiresAt);
    }

    void connectRealtime();

    return () => {
      isActive = false;
      clearRefreshTimer();
      clearStatusPollTimer();
      const supabase = supabaseRef.current;

      if (supabase && subscriptionChannel) {
        void supabase.removeChannel(subscriptionChannel);
      }

      if (supabase && paymentAttemptsChannel) {
        void supabase.removeChannel(paymentAttemptsChannel);
      }
    };
  }, [
    activePaddleCheckout,
    billing.currentPlan,
    confirmplan,
    handleCheckoutFailure,
    pendingCheckout,
    processingState,
    queueRefresh,
    scheduleActivationFallback,
    userId,
    businessId,
  ]);

  const contextValue = useMemo<BusinessCheckoutContextValue>(
    () => ({
      currentPlan,
      defaultCurrency: billing.defaultCurrency,
      pendingCheckout,
      region: billing.region,
      userId: billing.userId,
      businessId: billing.businessId,
      businessSlug: billing.businessSlug,
      openPlanSelection,
      openCheckout,
      continueCheckout,
    }),
    [
      currentPlan,
      billing.defaultCurrency,
      billing.region,
      billing.userId,
      billing.businessId,
      billing.businessSlug,
      continueCheckout,
      openCheckout,
      openPlanSelection,
      pendingCheckout,
    ],
  );

  return (
    <BusinessCheckoutContext.Provider value={contextValue}>
      {children}
      
        <PlanSelectionSheet
          currentPlan={currentPlan}
          defaultCurrency={billing.defaultCurrency}
          onOpenChange={setSheetOpen}
          onSelectPlan={openCheckout}
          open={sheetOpen}
          region={billing.region}
          targetPlan={targetPlan}
        />
      
      {selectedPlan ? (
        <Suspense fallback={null}>
          <CheckoutDialog
            key={checkoutKeyRef.current}
            checkoutError={checkoutError}
            currentPlan={currentPlan}
            defaultCurrency={billing.defaultCurrency}
            onCheckoutErrorChange={setCheckoutError}
            onChangePlan={changeCheckoutPlan}
            onOpenChange={setCheckoutOpen}
            onPaymentProcessingStart={beginCheckoutProcessing}
            onPaddleTransactionChange={setActivePaddleCheckout}
            open={checkoutOpen}
            pendingCheckout={pendingCheckout}
            interval={selectedInterval}
            plan={selectedPlan}
            region={billing.region}
            userId={billing.userId}
            businessId={billing.businessId}
            businessName={billing.businessName}
            businessSlug={billing.businessSlug}
          />
        </Suspense>
      ) : null}
      <Dialog open={Boolean(processingState)} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm gap-0" showCloseButton={false}>
          <DialogHeader className="px-6 pt-6 pb-0 text-center">
            <DialogTitle className="px-2 text-xl">
              Processing your payment
            </DialogTitle>
            <DialogDescription className="px-2">
              {processingState?.awaitingActivation
                ? "We received your payment. We're activating your account now."
                : `Refreshing ${planMeta[processingState?.plan ?? "pro"].label} access for your account.`}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col items-center gap-4 py-10">
            <Spinner aria-hidden="true" className="size-8" />
            <p className="text-center text-sm text-muted-foreground">
              {processingState
                ? `Applying ${planMeta[processingState.plan].label} to your account.`
                : "Updating your subscription."}
            </p>
          </DialogBody>
        </DialogContent>
      </Dialog>
      {successPlan ? (
        <UpgradeSuccessDialog
          onClose={() => setSuccessPlan(null)}
          plan={successPlan}
        />
      ) : null}
    </BusinessCheckoutContext.Provider>
  );
}
/* ── Upgrade success celebration dialog ──────────────────────────────────── */

function UpgradeSuccessDialog({
  onClose,
  plan,
}: {
  onClose: () => void;
  plan: PaidPlan;
}) {
  const PlanIcon = plan === "pro" ? Briefcase : Building2;
  const highlights = planUpgradeHighlights[plan];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        {/* Gradient header */}
        <div
          className={cn(
            "relative flex flex-col items-center gap-4 px-6 pt-10 pb-6",
            plan === "pro"
              ? "bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
              : "bg-gradient-to-b from-violet-500/10 via-violet-500/5 to-transparent",
          )}
        >
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl border shadow-sm",
              plan === "pro"
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
            )}
          >
            <PlanIcon className={cn("size-6", plan === "pro" && "text-primary")} />
          </div>
          <Sparkles
            aria-hidden="true"
            className={cn(
              "absolute top-4 right-8 size-4 opacity-40",
              plan === "pro" ? "text-primary" : "text-violet-500",
            )}
          />
          <Sparkles
            aria-hidden="true"
            className={cn(
              "absolute top-8 left-10 size-3 opacity-30",
              plan === "pro" ? "text-primary" : "text-violet-500",
            )}
          />
          <DialogHeader className="items-center gap-1 p-0">
            <DialogTitle className="text-center text-xl">
              Welcome to {planMeta[plan].label}
            </DialogTitle>
            <DialogDescription className="text-center text-balance">
              Your account has been upgraded. All {planMeta[plan].label} features are now unlocked across your businesses.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Feature list */}
        <DialogBody className="px-6 pt-2 pb-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <p className="meta-label mb-2.5">What&apos;s included</p>
            <ul className="flex flex-col gap-2">
              {highlights.map((feature) => (
                <li className="flex items-center gap-2.5 text-sm text-foreground" key={feature}>
                  <div
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full",
                      plan === "pro"
                        ? "bg-primary/10 text-primary"
                        : "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                    )}
                  >
                    <Check className="size-3" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </DialogBody>

        <DialogFooter className="px-6 pt-4 pb-6 sm:px-6">
          <Button className="w-full" onClick={onClose} size="lg">
            Get started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

