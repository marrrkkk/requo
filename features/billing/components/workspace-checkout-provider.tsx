"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

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
  cleanupExpiredPendingAction,
  getCheckoutStatusAction,
  getPendingCheckoutAction,
} from "@/features/billing/actions";
import { CheckoutDialog } from "@/features/billing/components/checkout-dialog";
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
  WorkspaceBillingOverview,
} from "@/features/billing/types";
import { planMeta } from "@/lib/plans";
import type { PaidPlan } from "@/lib/billing/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type WorkspaceCheckoutContextValue = {
  currentPlan: WorkspaceBillingOverview["currentPlan"];
  defaultCurrency: WorkspaceBillingOverview["defaultCurrency"];
  pendingCheckout: PersistedPendingCheckout | null;
  region: WorkspaceBillingOverview["region"];
  workspaceId: string;
  workspaceSlug: string;
  openPlanSelection: (targetPlan?: PaidPlan) => void;
  openCheckout: (plan: PaidPlan) => void;
  continueCheckout: () => void;
};

type WorkspaceSubscriptionRealtimeRow = {
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

const WorkspaceCheckoutContext =
  createContext<WorkspaceCheckoutContextValue | null>(null);
const PROCESSING_REFRESH_DELAY_MS = 1000;

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
  if (checkout.provider === "paymongo") {
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

  return {
    amount: checkout.amount,
    currency: "USD",
    interval: checkout.interval,
    plan: checkout.plan,
    provider: "paddle",
    transactionId: checkout.transactionId,
  };
}

function getPendingCheckoutFailureMessage(
  checkout: PersistedPendingCheckout,
  status?: string | null,
) {
  if (checkout.provider === "paymongo") {
    return status === "expired"
      ? "This QR Ph payment expired. Generate a new QR code to try again."
      : "QR Ph payment failed. Please try again.";
  }

  return "Payment failed. Please try again.";
}

export function useWorkspaceCheckout() {
  return useContext(WorkspaceCheckoutContext);
}

export function WorkspaceCheckoutProvider({
  billing,
  children,
}: {
  billing: WorkspaceBillingOverview;
  children: ReactNode;
}) {
  const workspaceId = billing.workspaceId;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);
  const [targetPlan, setTargetPlan] = useState<PaidPlan | undefined>(undefined);
  const [pendingCheckout, setPendingCheckout] =
    useState<PersistedPendingCheckout | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState | null>(
    null,
  );
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const refreshQueuedRef = useRef(false);
  const localExpiryHandledRef = useRef<string | null>(null);
  const pendingCheckoutVersionRef = useRef(0);

  const openPlanSelection = useCallback((nextTargetPlan?: PaidPlan) => {
    setCheckoutError(null);
    setTargetPlan(nextTargetPlan);
    setSheetOpen(true);
  }, []);

  const openCheckout = useCallback((plan: PaidPlan) => {
    setCheckoutError(null);
    setSheetOpen(false);
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  }, []);

  const continueCheckout = useCallback(() => {
    if (!pendingCheckout) {
      return;
    }

    setCheckoutError(null);
    setSelectedPlan(pendingCheckout.plan);
    setCheckoutOpen(true);
  }, [pendingCheckout]);

  const queueRefresh = useCallback(() => {
    if (refreshQueuedRef.current) {
      return;
    }

    refreshQueuedRef.current = true;

    window.setTimeout(() => {
      window.location.reload();
    }, PROCESSING_REFRESH_DELAY_MS);
  }, []);

  const handleCheckoutFailure = useCallback(
    (message: string, failedCheckout: PersistedPendingCheckout | null) => {
      clearCachedPendingCheckout(workspaceId);
      setProcessingState(null);
      setSelectedPlan(failedCheckout?.plan ?? selectedPlan);
      setCheckoutError(message);

      if (!checkoutOpen) {
        toast.error(message);
      }
    },
    [checkoutOpen, selectedPlan, workspaceId],
  );

  useEffect(() => {
    const initialCachedCheckout = getCachedPendingCheckout(workspaceId);

    if (initialCachedCheckout) {
      pendingCheckoutVersionRef.current += 1;
      setPendingCheckout(initialCachedCheckout);
    }

    return subscribeToPendingCheckout(workspaceId, (nextCheckout) => {
      pendingCheckoutVersionRef.current += 1;
      setPendingCheckout(nextCheckout);
    });
  }, [workspaceId]);

  useEffect(() => {
    let isActive = true;
    const recoveryVersion = pendingCheckoutVersionRef.current;

    async function recoverPendingCheckout() {
      const recovered = await getPendingCheckoutAction(workspaceId);

      if (!isActive) {
        return;
      }

      if (pendingCheckoutVersionRef.current !== recoveryVersion) {
        return;
      }

      if (!recovered) {
        clearCachedPendingCheckout(workspaceId);
        return;
      }

      const normalizedCheckout = normalizePendingCheckout(recovered);
      setSelectedPlan((currentPlan) => currentPlan ?? normalizedCheckout.plan);
      setCachedPendingCheckout(workspaceId, normalizedCheckout);
    }

    void recoverPendingCheckout();

    return () => {
      isActive = false;
    };
  }, [workspaceId]);

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
      void cleanupExpiredPendingAction(workspaceId);
    };

    if (expiresInMs <= 0) {
      handleExpiry();
      return;
    }

    const timer = window.setTimeout(handleExpiry, expiresInMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [handleCheckoutFailure, pendingCheckout, workspaceId]);

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

    clearCachedPendingCheckout(workspaceId);
    refreshQueuedRef.current = false;
    queueMicrotask(() => {
      setProcessingState(null);
      setCheckoutOpen(false);
      setCheckoutError(null);
      setSelectedPlan(null);
    });
  }, [
    billing.currentPlan,
    billing.subscription?.status,
    processingState,
    workspaceId,
  ]);

  useEffect(() => {
    const shouldMonitorRealtime = Boolean(pendingCheckout || processingState);

    if (!shouldMonitorRealtime) {
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
    let isSyncingCheckoutStatus = false;

    const planToTrack = pendingCheckout?.plan ?? processingState?.plan ?? null;
    const trackedPaymentAttemptId = pendingCheckout
      ? pendingCheckout.provider === "paymongo"
        ? pendingCheckout.paymentIntentId
        : pendingCheckout.transactionId
      : null;

    function clearRefreshTimer() {
      if (refreshTimerId) {
        window.clearTimeout(refreshTimerId);
        refreshTimerId = null;
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

    async function refreshRealtimeAuth() {
      const nextToken = await fetchRealtimeToken();

      if (!nextToken || !isActive) {
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

    function handleSubscriptionRow(row: WorkspaceSubscriptionRealtimeRow) {
      const status = row.status;
      const rowPlan = row.plan;

      if (
        planToTrack &&
        rowPlan === planToTrack &&
        (status === "active" || status === "past_due")
      ) {
        beginProcessing(planToTrack, false);
        clearCachedPendingCheckout(workspaceId);
        queueRefresh();
        return;
      }

      if (!pendingCheckout) {
        return;
      }

      if (
        pendingCheckout.provider === "paymongo" &&
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
      if (!pendingCheckout || !trackedPaymentAttemptId) {
        return;
      }

      if (row.provider_payment_id !== trackedPaymentAttemptId) {
        return;
      }

      if (row.status === "succeeded") {
        if (pendingCheckout.provider === "paymongo") {
          beginProcessing(pendingCheckout.plan, true);
          clearCachedPendingCheckout(workspaceId);
          return;
        }

        beginProcessing(pendingCheckout.plan, true);
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
          workspaceId,
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

    async function connectRealtime() {
      const tokenData = await fetchRealtimeToken();

      if (!tokenData || !isActive) {
        return;
      }

      await supabase.realtime.setAuth(tokenData.token);
      await syncCheckoutStatus();

      subscriptionChannel = supabase
        .channel(`workspace-subscription:${workspaceId}:${planToTrack ?? "any"}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            filter: `workspace_id=eq.${workspaceId}`,
            schema: "public",
            table: "workspace_subscriptions",
          },
          (payload) => {
            handleSubscriptionRow(payload.new as WorkspaceSubscriptionRealtimeRow);
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
            handleSubscriptionRow(payload.new as WorkspaceSubscriptionRealtimeRow);
          },
        )
        .subscribe();

      if (trackedPaymentAttemptId) {
        paymentAttemptsChannel = supabase
          .channel(`payment-attempt:${workspaceId}:${trackedPaymentAttemptId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              filter: `workspace_id=eq.${workspaceId}`,
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
              filter: `workspace_id=eq.${workspaceId}`,
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

      if (subscriptionChannel) {
        void supabase.removeChannel(subscriptionChannel);
      }

      if (paymentAttemptsChannel) {
        void supabase.removeChannel(paymentAttemptsChannel);
      }
    };
  }, [
    billing.currentPlan,
    handleCheckoutFailure,
    pendingCheckout,
    processingState,
    queueRefresh,
    workspaceId,
  ]);

  const contextValue = useMemo<WorkspaceCheckoutContextValue>(
    () => ({
      currentPlan: billing.currentPlan,
      defaultCurrency: billing.defaultCurrency,
      pendingCheckout,
      region: billing.region,
      workspaceId: billing.workspaceId,
      workspaceSlug: billing.workspaceSlug,
      openPlanSelection,
      openCheckout,
      continueCheckout,
    }),
    [
      billing.currentPlan,
      billing.defaultCurrency,
      billing.region,
      billing.workspaceId,
      billing.workspaceSlug,
      continueCheckout,
      openCheckout,
      openPlanSelection,
      pendingCheckout,
    ],
  );

  return (
    <WorkspaceCheckoutContext.Provider value={contextValue}>
      {children}
      <PlanSelectionSheet
        currentPlan={billing.currentPlan}
        defaultCurrency={billing.defaultCurrency}
        onOpenChange={setSheetOpen}
        onSelectPlan={openCheckout}
        open={sheetOpen}
        region={billing.region}
        targetPlan={targetPlan}
      />
      {selectedPlan ? (
        <CheckoutDialog
          checkoutError={checkoutError}
          currentPlan={billing.currentPlan}
          defaultCurrency={billing.defaultCurrency}
          onCheckoutErrorChange={setCheckoutError}
          onOpenChange={setCheckoutOpen}
          open={checkoutOpen}
          pendingCheckout={pendingCheckout}
          plan={selectedPlan}
          region={billing.region}
          workspaceId={billing.workspaceId}
          workspaceSlug={billing.workspaceSlug}
        />
      ) : null}
      <Dialog open={Boolean(processingState)} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm gap-0" showCloseButton={false}>
          <DialogHeader className="px-6 pt-6 pb-0 text-center">
            <DialogTitle className="px-2 text-xl">
              Processing your payment
            </DialogTitle>
            <DialogDescription className="px-2">
              {processingState?.awaitingActivation
                ? "We received your payment. We're activating your workspace now."
                : `Refreshing ${planMeta[processingState?.plan ?? "pro"].label} access for this workspace.`}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col items-center gap-4 py-10">
            <Spinner aria-hidden="true" className="size-8" />
            <p className="text-center text-sm text-muted-foreground">
              {processingState
                ? `Applying ${planMeta[processingState.plan].label} across the workspace.`
                : "Updating your subscription."}
            </p>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </WorkspaceCheckoutContext.Provider>
  );
}
