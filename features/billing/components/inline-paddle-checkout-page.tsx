"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  Shield,
} from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
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
import { planMeta } from "@/lib/plans";
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

const planHighlights: Record<PaidPlan, string[]> = {
  pro: [
    "Unlimited quotes & follow-ups",
    "AI assistant (100 gen/mo)",
    "Workflow analytics",
    "Page customization & branding",
    "Up to 5 businesses",
  ],
  business: [
    "Everything in Pro",
    "Team members (25/business)",
    "500 AI generations/mo",
    "Unlimited businesses",
    "Priority support",
  ],
};

export function InlinePaddleCheckoutPage(props: InlinePaddleCheckoutPageProps) {
  const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? null;
  const paddleEnvironment = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ??
    "sandbox") as "sandbox" | "production";

  if (!paddleClientToken) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <div className="soft-panel max-w-md px-6 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Paddle checkout is not configured for this environment.
          </p>
        </div>
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

  const paddleTheme = "light" as const;

  const amount = useMemo(
    () => getPlanPrice(plan, "USD", interval),
    [interval, plan],
  );

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
            frameStyle:
              "width: 100%; min-width: 100%; border: none; background: transparent;",
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

  const isPreparingCheckout = !paddle.isReady || !transactionId;
  const isCheckoutLoaded = checkoutLoadedKey === currentPlanKey;
  const showLoading = isPreparingCheckout || !isCheckoutLoaded;

  return (
    <>
      {/* Full-page loading overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-300",
          showLoading && !activeCheckoutError
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <Loader2 className="size-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Preparing secure checkout…
        </p>
      </div>

      {/* Error state */}
      {activeCheckoutError ? (
        <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-background px-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-5 text-center">
            <p className="text-sm text-destructive">{activeCheckoutError}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      ) : null}

      {/* Checkout layout */}
      <div
        className={cn(
          "min-h-svh w-full bg-background transition-opacity duration-300",
          showLoading && !activeCheckoutError ? "opacity-0" : "opacity-100",
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 w-full items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6">
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link href="/account/billing">
                <ArrowLeft className="size-3.5" />
                <span className="max-sm:sr-only">Back</span>
              </Link>
            </Button>
            <div className="h-4 w-px bg-border/70 max-sm:hidden" />
            <BrandMark href="/account/billing" subtitle={null} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" />
            <span className="max-sm:hidden">Secure checkout</span>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12">
            {/* Payment form */}
            <div className="order-1 lg:order-1">
              <div className="mb-5">
                <h1 className="font-heading text-xl font-semibold tracking-tight">
                  Payment details
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your subscription starts immediately after payment.
                </p>
              </div>

              {/* Paddle frame */}
              <div className="rounded-xl border border-border/60 bg-card/50 p-1">
                <div
                  id={PADDLE_FRAME_TARGET}
                  className={`${PADDLE_FRAME_TARGET} min-h-[500px] overflow-hidden rounded-lg`}
                />
              </div>

              <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Shield className="size-3 text-primary/70" />
                  256-bit SSL
                </span>
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3 text-primary/70" />
                  Paddle secure payments
                </span>
              </div>
            </div>

            {/* Order summary */}
            <div className="order-2 lg:sticky lg:top-20 lg:order-2 lg:self-start">
              <div className="rounded-xl border border-border/60 bg-card/70">
                {/* Plan info */}
                <div className="p-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {planMeta[plan].label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {interval === "yearly" ? "Annual" : "Monthly"} billing
                    </p>
                  </div>

                  <ul className="mt-4 flex flex-col gap-1.5">
                    {planHighlights[plan].map((feature) => (
                      <li
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                        key={feature}
                      >
                        <Check className="size-3 shrink-0 text-primary/70" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    className="mt-4 text-xs font-medium text-primary hover:underline"
                    onClick={() => setPlanSheetOpen(true)}
                    type="button"
                  >
                    Change plan
                  </button>
                </div>

                {/* Price */}
                <div className="border-t border-border/50 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {planMeta[plan].label} ({interval === "yearly" ? "annual" : "monthly"})
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {formatPrice(amount, "USD")}
                    </span>
                  </div>
                  {interval === "yearly" ? (
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Per month
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(Math.round(amount / 12), "USD")}/mo
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tax</span>
                    <span className="text-xs text-muted-foreground">
                      Calculated at checkout
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between border-t border-border/40 pt-4">
                    <span className="text-sm font-medium text-foreground">
                      Due today
                    </span>
                    <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
                      {formatPrice(amount, "USD")}
                      <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                        /{interval === "yearly" ? "yr" : "mo"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Context */}
              <p className="mt-3 px-1 text-[11px] leading-4 text-muted-foreground">
                Subscribing for{" "}
                <span className="font-medium text-foreground">
                  {businessName}
                </span>
                .{" "}
                {currentPlan !== "free"
                  ? `Upgrading from ${planMeta[currentPlan].label}.`
                  : "Currently on the free plan."}
              </p>

              <div className="mt-3 flex gap-3 px-1 text-[11px] text-muted-foreground">
                <Link href="/terms" className="hover:text-foreground">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
                <Link href="/refund-policy" className="hover:text-foreground">
                  Refunds
                </Link>
              </div>
            </div>
          </div>
        </main>
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
