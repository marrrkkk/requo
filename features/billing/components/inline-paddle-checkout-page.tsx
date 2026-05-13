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
  Briefcase,
  Building2,
  Check,
  Loader2,
  Lock,
  Shield,
} from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    "Unlimited inquiries and quotes",
    "Follow-up reminders and tracking",
    "AI-assisted quote drafts",
    "Custom branding",
  ],
  business: [
    "Everything in Pro",
    "Team members and roles",
    "Advanced analytics",
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
        <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-background px-4">
          <div className="section-panel max-w-md px-6 py-6 text-center">
            <p className="text-sm text-destructive">{activeCheckoutError}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      ) : null}

      {/* Checkout page */}
      <div
        className={cn(
          "min-h-svh w-full bg-background transition-opacity duration-300",
          showLoading && !activeCheckoutError ? "opacity-0" : "opacity-100",
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <BrandMark href="/account/billing" subtitle="Checkout" />
            <div className="h-4 w-px bg-border max-sm:hidden" />
            <Button asChild className="max-sm:hidden" size="sm" variant="ghost">
              <Link href="/account/billing">
                <ArrowLeft data-icon="inline-start" className="size-4" />
                Back to billing
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            <span className="max-sm:hidden">Secure checkout</span>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10 xl:gap-14">
            {/* Left: Paddle checkout frame */}
            <section className="order-2 min-w-0 lg:order-1">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                    Complete your subscription
                  </h1>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Enter your payment details below. Your subscription starts immediately.
                  </p>
                </div>

                <div className="section-panel overflow-hidden">
                  <div
                    id={PADDLE_FRAME_TARGET}
                    className={`${PADDLE_FRAME_TARGET} min-h-[500px]`}
                  />
                </div>

                {/* Trust signals */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Shield className="size-3.5 text-primary" />
                    256-bit SSL encryption
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="size-3.5 text-primary" />
                    Processed by Paddle
                  </span>
                </div>
              </div>
            </section>

            {/* Right: Order summary sidebar */}
            <aside className="order-1 lg:sticky lg:top-[6rem] lg:order-2 lg:self-start">
              <div className="flex flex-col gap-5">
                {/* Plan card */}
                <div className="section-panel overflow-hidden">
                  <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
                    {/* Plan header */}
                    <div className="flex items-start gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/90">
                        <PlanIcon className="size-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="font-heading text-base font-semibold tracking-tight">
                            {planMeta[plan].label}
                          </h2>
                          <Badge variant="secondary" className="text-[10px]">
                            {interval === "yearly" ? "Annual" : "Monthly"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {planMeta[plan].description}
                        </p>
                      </div>
                    </div>

                    {/* Plan features */}
                    <div className="flex flex-col gap-2">
                      {planHighlights[plan].map((feature) => (
                        <div className="flex items-center gap-2.5" key={feature}>
                          <Check className="size-3.5 shrink-0 text-primary" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      onClick={() => setPlanSheetOpen(true)}
                      type="button"
                    >
                      Change plan or interval
                    </Button>
                  </div>

                  <Separator className="bg-border/60" />

                  {/* Pricing breakdown */}
                  <div className="flex flex-col gap-3 px-5 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {planMeta[plan].label} ({interval === "yearly" ? "annual" : "monthly"})
                      </span>
                      <span className="font-medium text-foreground">
                        {formatPrice(amount, "USD")}
                      </span>
                    </div>

                    {interval === "yearly" ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Monthly equivalent
                        </span>
                        <span className="text-muted-foreground">
                          {formatPrice(Math.round(amount / 12), "USD")}/mo
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="text-muted-foreground">
                        Calculated at checkout
                      </span>
                    </div>

                    <Separator className="bg-border/60" />

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        Total due today
                      </span>
                      <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
                        {formatPrice(amount, "USD")}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          /{interval === "yearly" ? "yr" : "mo"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Business context note */}
                <div className="soft-panel px-4 py-3.5">
                  <p className="text-xs leading-5 text-muted-foreground">
                    Subscribing for <span className="font-medium text-foreground">{businessName}</span>.
                    {currentPlan !== "free" ? (
                      <> Upgrading from {currentPlan} plan.</>
                    ) : (
                      <> Currently on the free plan.</>
                    )}
                  </p>
                </div>

                {/* Links */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Link
                    href="/terms"
                    className="transition-colors hover:text-foreground"
                  >
                    Terms
                  </Link>
                  <Link
                    href="/privacy"
                    className="transition-colors hover:text-foreground"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/refund-policy"
                    className="transition-colors hover:text-foreground"
                  >
                    Refund policy
                  </Link>
                </div>
              </div>
            </aside>
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
