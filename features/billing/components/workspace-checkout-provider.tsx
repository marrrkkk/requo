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
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const planUpgradeHighlights: Record<PaidPlan, string[]> = {
  pro: [
    "Unlimited inquiries and quotes",
    "Multiple inquiry forms",
    "AI assistant and knowledge base",
    "Data exports and custom branding",
    "Multiple businesses per workspace",
  ],
  business: [
    "Everything in Pro, plus",
    "Team members and roles",
    "Priority support",
    "Unlimited businesses",
    "Highest limits across the board",
  ],
};

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

type ActivePaddleCheckout = {
  plan: PaidPlan;
  transactionId: string;
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
  const router = useRouter();
  const workspaceId = billing.workspaceId;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);
  const [targetPlan, setTargetPlan] = useState<PaidPlan | undefined>(undefined);
  const [pendingCheckout, setPendingCheckout] =
    useState<PersistedPendingCheckout | null>(null);
  const [activePaddleCheckout, setActivePaddleCheckout] =
    useState<ActivePaddleCheckout | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState | null>(
    null,
  );
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [successPlan, setSuccessPlan] = useState<PaidPlan | null>(null);
  const refreshQueuedRef = useRef(false);
  const localExpiryHandledRef = useRef<string | null>(null);
  const pendingCheckoutVersionRef = useRef(0);
  const checkoutKeyRef = useRef(0);

  const openPlanSelection = useCallback((nextTargetPlan?: PaidPlan) => {
    setCheckoutError(null);
    setTargetPlan(nextTargetPlan);
    setSheetOpen(true);
  }, []);

  const openCheckout = useCallback((plan: PaidPlan) => {
    checkoutKeyRef.current += 1;
    setCheckoutError(null);
    setSheetOpen(false);
    setSelectedPlan(plan);
    setCheckoutOpen(true);
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

  const queueRefresh = useCallback(() => {
    if (refreshQueuedRef.current) {
      return;
    }

    refreshQueuedRef.current = true;

    window.setTimeout(() => {
      router.refresh();
    }, PROCESSING_REFRESH_DELAY_MS);
  }, [router]);

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
    const upgradedPlan = processingState.plan;
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
    processingState,
    workspaceId,
  ]);

  useEffect(() => {
    const shouldMonitorRealtime = Boolean(
      pendingCheckout || activePaddleCheckout || processingState,
    );

    if (!shouldMonitorRealtime) {
      return;
    }

    let isActive = true;
    const supabase = createSupabaseBrowserClient();
    // Unique suffix prevents collisions when the effect re-runs before the
    // previous cleanup's `removeChannel` fully completes (async race).
    const channelSuffix = Date.now();
    let refreshTimerId: number | null = null;
    let subscriptionChannel:
      | Awaited<ReturnType<typeof supabase.channel>>
      | null = null;
    let paymentAttemptsChannel:
      | Awaited<ReturnType<typeof supabase.channel>>
      | null = null;
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
          clearCachedPendingCheckout(workspaceId);
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
        .channel(`workspace-subscription:${workspaceId}:${planToTrack ?? "any"}:${channelSuffix}`)
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
          .channel(`payment-attempt:${workspaceId}:${trackedPaymentAttemptId}:${channelSuffix}`)
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
    activePaddleCheckout,
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
          key={checkoutKeyRef.current}
          checkoutError={checkoutError}
          currentPlan={billing.currentPlan}
          defaultCurrency={billing.defaultCurrency}
          onCheckoutErrorChange={setCheckoutError}
          onOpenChange={setCheckoutOpen}
          onPaddleTransactionChange={setActivePaddleCheckout}
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
      {successPlan ? (
        <UpgradeSuccessDialog
          onClose={() => setSuccessPlan(null)}
          plan={successPlan}
        />
      ) : null}
    </WorkspaceCheckoutContext.Provider>
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
              Your workspace has been upgraded. All {planMeta[plan].label} features are now unlocked.
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
