"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Building2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { PlanSelectionSheet } from "@/features/billing/components/plan-selection-sheet";
import {
  PaddleProvider,
  usePaddle,
} from "@/features/billing/components/paddle-provider";
import { formatPrice, getPlanPrice } from "@/lib/billing/plans";
import type {
  BillingCurrency,
  BillingInterval,
  BillingRegion,
  PaidPlan,
} from "@/lib/billing/types";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import { cn } from "@/lib/utils";

const PADDLE_FRAME_TARGET = "requo-inline-paddle-frame";

type CheckoutTransaction = {
  requestKey: string;
  transactionId: string;
};

type CheckoutError = {
  requestKey: string;
  message: string;
};

type InlinePaddleCheckoutPageProps = {
  businessId: string;
  businessName: string;
  currentPlan: plan;
  defaultCurrency: BillingCurrency;
  region: BillingRegion;
  initialPlan: PaidPlan;
  initialInterval: BillingInterval;
};

type CheckoutShellProps = InlinePaddleCheckoutPageProps & {
  paddleClientToken: string | null;
  paddleEnvironment: "sandbox" | "production";
};

export function InlinePaddleCheckoutPage(props: InlinePaddleCheckoutPageProps) {
  const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? null;
  const paddleEnvironment = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ??
    "sandbox") as "sandbox" | "production";

  if (!paddleClientToken) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
        Paddle checkout is not configured for this environment.
      </div>
    );
  }

  return (
    <PaddleProvider
      clientToken={paddleClientToken}
      environment={paddleEnvironment}
    >
      <InlineCheckoutShell
        {...props}
        paddleClientToken={paddleClientToken}
        paddleEnvironment={paddleEnvironment}
      />
    </PaddleProvider>
  );
}

function InlineCheckoutShell({
  businessId,
  businessName,
  currentPlan,
  defaultCurrency,
  region,
  initialPlan,
  initialInterval,
}: CheckoutShellProps) {
  const paddle = usePaddle();
  const { resolvedTheme } = useTheme();
  const [plan, setPlan] = useState<PaidPlan>(initialPlan);
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [transaction, setTransaction] = useState<CheckoutTransaction | null>(
    null,
  );
  const [checkoutError, setCheckoutError] = useState<CheckoutError | null>(
    null,
  );
  const [checkoutLoadedKey, setCheckoutLoadedKey] = useState<string | null>(null);
  const lastRequestedKeyRef = useRef<string | null>(null);
  const openedTransactionRef = useRef<string | null>(null);

  const paddleTheme = resolvedTheme === "dark" ? "dark" : "light";

  const amount = useMemo(
    () => getPlanPrice(plan, "USD", interval),
    [interval, plan],
  );

  // Detect when the Paddle iframe has been injected into the container.
  // Uses a MutationObserver (external system subscription) so the setState
  // call happens in the observer callback, not synchronously in the effect body.
  const currentPlanKey = `${plan}:${interval}`;
  const requestKey = `${businessId}:${currentPlanKey}`;
  const transactionId =
    transaction?.requestKey === requestKey ? transaction.transactionId : null;
  const activeCheckoutError =
    checkoutError?.requestKey === requestKey ? checkoutError.message : null;

  useEffect(() => {
    if (!paddle.isReady || !transactionId) {
      return;
    }

    const container = document.querySelector(`.${PADDLE_FRAME_TARGET}`);
    if (!container) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (container.querySelector("iframe")) {
        setCheckoutLoadedKey(currentPlanKey);
        observer.disconnect();
      }
    });

    // If iframe is already present, the observer won't fire for past mutations,
    // so schedule a microtask check that runs outside the synchronous effect body.
    if (container.querySelector("iframe")) {
      queueMicrotask(() => setCheckoutLoadedKey(currentPlanKey));
    } else {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
    };
  }, [paddle.isReady, transactionId, currentPlanKey]);

  useEffect(() => {
    if (!transactionId || !paddle.isReady) {
      return;
    }

    if (openedTransactionRef.current === transactionId) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const openWhenReady = () => {
      if (cancelled) {
        return;
      }

      const frameTarget = document.querySelector(`.${PADDLE_FRAME_TARGET}`);
      if (!frameTarget) {
        attempts += 1;
        if (attempts < 15) {
          window.setTimeout(openWhenReady, 100);
          return;
        }
        setCheckoutError({
          message: "Unable to open checkout. Please reload and try again.",
          requestKey,
        });
        return;
      }

      try {
        paddle.openCheckout(
          transactionId,
          {
            onError: (message) => {
              setCheckoutError({ message, requestKey });
            },
          },
          {
            displayMode: "inline",
            frameStyle: "width: 100%; min-width: 100%; border: none;",
            frameTarget: PADDLE_FRAME_TARGET,
            frameInitialHeight: "550",
            theme: paddleTheme,
            variant: "one-page",
          },
        );
        openedTransactionRef.current = transactionId;
      } catch {
        setCheckoutError({
          message: "Unable to open checkout. Please reload and try again.",
          requestKey,
        });
      }
    };

    openWhenReady();
    return () => {
      cancelled = true;
    };
  }, [paddle, paddleTheme, requestKey, transactionId]);

  useEffect(() => {
    if (!paddle.isReady) {
      return;
    }

    if (lastRequestedKeyRef.current === requestKey) {
      return;
    }

    lastRequestedKeyRef.current = requestKey;
    openedTransactionRef.current = null;

    let isCancelled = false;
    async function initializeCheckout() {
      try {
        const response = await fetch("/api/account/billing/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId,
            interval,
            plan,
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          transactionId?: string;
        };
        if (isCancelled) {
          return;
        }
        if (!response.ok || !data.transactionId) {
          setCheckoutError({
            message: data.error ?? "Unable to load checkout.",
            requestKey,
          });
          return;
        }
        setTransaction({ requestKey, transactionId: data.transactionId });
      } catch {
        if (!isCancelled) {
          setCheckoutError({
            message: "Unable to load checkout.",
            requestKey,
          });
        }
      }
    }

    void initializeCheckout();
    return () => {
      isCancelled = true;
    };
  }, [businessId, interval, paddle.isReady, plan, requestKey]);

  const subtotal = amount;
  const tax = 0;
  const total = subtotal + tax;
  const isPreparingCheckout = !paddle.isReady || !transactionId;
  const isCheckoutLoaded = checkoutLoadedKey === currentPlanKey;
  const showLoading = isPreparingCheckout || !isCheckoutLoaded;

  const PlanIcon = plan === "pro" ? Briefcase : Building2;

  return (
    <>
      {/* Full-page loading state */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-300",
          showLoading && !activeCheckoutError
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Preparing secure checkout…
        </p>
      </div>

      {/* Error state */}
      {activeCheckoutError ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-4 text-center">
            <p className="text-sm text-destructive">{activeCheckoutError}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      ) : null}

      {/* Two-column checkout layout */}
      <div
        className={cn(
          "mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 transition-opacity duration-300 sm:px-6 sm:py-8 lg:grid-cols-[auto_1fr] lg:gap-10 lg:px-8",
          showLoading && !activeCheckoutError ? "opacity-0" : "opacity-100",
        )}
      >
        {/* Left panel – order summary */}
        <aside className="flex w-full flex-col lg:w-[380px]">
          <Link
            href="/account/billing"
            className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="size-4" />
            Return to Requo
          </Link>

          <Card className="border-border/60">
            <CardContent className="p-5 sm:p-6">
              {/* Total price */}
              <div className="mb-6">
                <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {formatPrice(total, "USD")}
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    inc. tax
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  billed {interval === "yearly" ? "yearly" : "monthly"}
                </p>
              </div>

              {/* Plan item */}
              <div className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <PlanIcon className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {plan === "pro" ? "Pro plan" : "Business plan"}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatPrice(amount, "USD")}
                        <span className="font-normal text-muted-foreground">
                          /{interval === "yearly" ? "year" : "month"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Qty: 1
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setPlanSheetOpen(true)}
                  type="button"
                >
                  Change plan
                </Button>
              </div>

              {/* Pricing breakdown */}
              <div className="mt-6 space-y-2.5 border-t border-border/50 pt-5 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal, "USD")}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{formatPrice(tax, "USD")}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-2.5 font-semibold text-foreground">
                  <span>Total</span>
                  <span>{formatPrice(total, "USD")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer info */}
          <p className="mt-4 text-xs text-muted-foreground">
            {businessName} · Current plan: {currentPlan}. Checkout processed securely by Paddle.
          </p>
        </aside>

        {/* Right panel – Paddle inline checkout */}
        <section className="flex min-w-0 flex-col">
          <div
            id={PADDLE_FRAME_TARGET}
            className={`${PADDLE_FRAME_TARGET} min-h-[500px] flex-1`}
          />
        </section>
      </div>

      <PlanSelectionSheet
        currentPlan={currentPlan}
        defaultCurrency={defaultCurrency}
        onOpenChange={setPlanSheetOpen}
        onSelectPlan={(nextPlan, nextInterval) => {
          setPlan(nextPlan);
          setInterval(nextInterval);
          setPlanSheetOpen(false);
          lastRequestedKeyRef.current = null;
          openedTransactionRef.current = null;
        }}
        open={planSheetOpen}
        region={region}
        targetPlan={plan}
      />
    </>
  );
}
