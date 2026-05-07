"use client";

/**
 * Billing status card for business settings.
 * SaaS-style billing overview with current plan, subscription details,
 * payment method info, and action buttons.
 */

import { useActionState, useEffect } from "react";
import {
  CreditCard,
  QrCode,
  CircleCheck,
  CircleAlert,
  Clock,
  CircleMinus,
  CircleDashed,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { PlanBadge } from "@/components/shared/paywall";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { cancelSubscriptionAction } from "@/features/billing/actions";
import { clearCachedPendingCheckout, clearCachedPendingQrCheckout } from "@/features/billing/pending-checkout";
import type { AccountBillingOverview, CancelActionState } from "@/features/billing/types";
import { planMeta, getUsageLimit } from "@/lib/plans";
import { cn } from "@/lib/utils";

type BillingStatusCardProps = {
  billing: AccountBillingOverview;
  /** Free plan usage meters (business-wide). */
  freePlanUsage?: {
    inquiries: number;
    quotes: number;
    requoQuoteEmailsThisMonth: number;
  };
  variant?: "full" | "overview";
};

export function BillingStatusCard({
  billing,
  freePlanUsage,
  variant = "full",
}: BillingStatusCardProps) {
  const { subscription, currentPlan: billingCurrentPlan, userId, businessId, businessSlug, region, defaultCurrency } =
    billing;
  const businessCheckout = useBusinessCheckout();
  const currentPlan =
    businessCheckout?.businessId === businessId
      ? businessCheckout.currentPlan
      : billingCurrentPlan;
  const [cancelState, cancelAction, isCanceling] = useActionState(
    cancelSubscriptionAction,
    {} as CancelActionState,
  );

  const isFreePlan = currentPlan === "free";

  // Clear cached QR when a pending payment is cancelled
  const cancelSuccess = cancelState.success;
  useEffect(() => {
    if (cancelSuccess) {
      clearCachedPendingCheckout(userId);
    }
  }, [cancelSuccess, userId]);

  const hasActiveSubscription =
    subscription &&
    (subscription.status === "active" || subscription.status === "past_due");
  const hasPendingSubscription =
    subscription && subscription.status === "pending";
  const hasSubscription = hasActiveSubscription || hasPendingSubscription;
  const isOverviewVariant = variant === "overview";

  // Clear stale QR cache when the server confirms no pending subscription.
  // This handles the page-reload case where a webhook (payment.expired /
  // payment.failed) updated the status but the sessionStorage cache wasn't
  // cleared (e.g. user closed the tab or realtime was disconnected).
  useEffect(() => {
    if (subscription?.provider !== "paymongo" || !hasPendingSubscription) {
      clearCachedPendingQrCheckout(userId);
    }
  }, [hasPendingSubscription, subscription?.provider, userId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:justify-center">
      <div className="flex flex-col gap-6">
      {/* Current plan overview */}
      <Card className={cn(isOverviewVariant && "gap-0")}>
        {isOverviewVariant ? (
          <CardHeader className="gap-3 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-2">
                <span className="meta-label">Current plan</span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <CardTitle className="text-2xl">
                    {planMeta[currentPlan].label}
                  </CardTitle>
                  {hasSubscription ? (
                    <StatusBadge
                      status={subscription.status}
                      canceled={!!subscription.canceledAt}
                    />
                  ) : null}
                </div>
              </div>
              <PlanBadge className="shrink-0" plan={currentPlan} />
            </div>
            <CardDescription className="max-w-[34ch] leading-relaxed">
              {planMeta[currentPlan].description}
            </CardDescription>
          </CardHeader>
        ) : (
          <>
            <CardHeader className="pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="meta-label">Current plan</span>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl">
                      {planMeta[currentPlan].label}
                    </CardTitle>
                    {hasSubscription ? (
                      <StatusBadge
                        status={subscription.status}
                        canceled={!!subscription.canceledAt}
                      />
                    ) : null}
                  </div>
                </div>
                <PlanBadge plan={currentPlan} />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {planMeta[currentPlan].description}
              </p>
            </CardContent>
          </>
        )}
        {currentPlan !== "business" ? (
          <CardFooter className="flex-wrap gap-2.5">
            <UpgradeButton
              currentPlan={currentPlan}
              defaultCurrency={defaultCurrency}
              region={region}
              userId={userId}
              businessId={businessId}
              businessSlug={businessSlug}
            >
              {variant === "full" ? (
                <>
                  <ArrowUpRight data-icon="inline-start" />
                  Change plan
                </>
              ) : undefined}
            </UpgradeButton>
          </CardFooter>
        ) : null}
      </Card>

      

      {/* Billing Details */}
      {hasSubscription && variant === "full" ? (
        <Card id="billing-details">
          <CardHeader>
            <CardTitle className="text-lg">Billing details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3">
              {subscription.provider ? (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    {subscription.provider === "paymongo" ? (
                      <QrCode className="size-4" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    <span>Payment method</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {subscription.provider === "paymongo"
                      ? "QR Ph"
                      : "Card"}
                  </span>
                </div>
              ) : null}

              {subscription.currentPeriodEnd ? (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" />
                    <span>
                      {subscription.canceledAt || subscription.status === "canceled"
                        ? "Access until"
                        : "Next renewal"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Cancellation warning */}
            {subscription?.canceledAt && subscription.status === "active" ? (
              <Alert variant="default" className="border-amber-200/60 bg-amber-50/50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
                <CircleAlert className="size-4" />
                <div>
                  <p className="text-sm font-medium">Subscription canceling</p>
                  <p className="mt-1 text-sm opacity-90">
                    Your subscription will cancel at the end of this billing period.
                    You&apos;ll keep full access until then.
                  </p>
                </div>
              </Alert>
            ) : null}

            {/* Success / error messages */}
            {cancelState.success ? (
              <Alert variant="default" className="border-emerald-200/60 bg-emerald-50/50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                <CircleCheck className="size-4" />
                <p className="text-sm">{cancelState.success}</p>
              </Alert>
            ) : null}
            {cancelState.error ? (
              <Alert variant="destructive">
                <CircleAlert className="size-4" />
                <p className="text-sm">{cancelState.error}</p>
              </Alert>
            ) : null}
          </CardContent>

          {!subscription.canceledAt &&
          (subscription.status === "active" || subscription.status === "pending") ? (
            <CardFooter className="flex-wrap gap-2.5 border-t border-border/40 pt-6">
              <form action={cancelAction}>
                <input name="businessId" type="hidden" value={businessId} />
                <Button
                  disabled={isCanceling}
                  size="sm"
                  type="submit"
                  variant="destructive"
                >
                  {isCanceling ? (
                    <>
                      <Spinner aria-hidden="true" className="text-destructive-foreground" />
                      Canceling...
                    </>
                  ) : subscription.status === "pending" ? (
                    "Cancel pending payment"
                  ) : (
                    "Cancel subscription"
                  )}
                </Button>
              </form>
            </CardFooter>
          ) : null}
        </Card>
      ) : null}

      {isFreePlan && freePlanUsage ? (
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-lg">Usage</CardTitle>
            <p className="text-xs text-muted-foreground">
              Resets monthly on the 1st (UTC)
            </p>
          </CardHeader>
          <CardContent className="grid gap-5">
            <UsageMeter
              current={freePlanUsage.inquiries}
              label="Inquiries"
              limit={getUsageLimit("free", "inquiriesPerMonth") ?? 100}
            />
            <UsageMeter
              current={freePlanUsage.quotes}
              label="Quotes"
              limit={getUsageLimit("free", "quotesPerMonth") ?? 50}
            />
            <UsageMeter
              current={freePlanUsage.requoQuoteEmailsThisMonth}
              label="Emails sent"
              limit={getUsageLimit("free", "requoQuoteEmailsPerMonth") ?? 30}
            />
          </CardContent>
        </Card>
      ) : null}
      </div>
    </div>
  );
}

/* ── Free plan monthly usage ─────────────────────────────────────────────── */

function UsageMeter({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}) {
  const pct =
    limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{current}</span>
          {" / "}
          {limit}
        </span>
      </div>
      <Progress
        aria-label={`${label}: ${current} of ${limit} used this month`}
        className="h-2"
        value={pct}
      />
    </div>
  );
}


/* ── Status badge ─────────────────────────────────────────────────────────── */

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  active: {
    label: "Active",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-400/15 dark:text-emerald-400",
    icon: CircleCheck,
  },
  canceled: {
    label: "Canceling",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:border-amber-400/25 dark:bg-amber-400/15 dark:text-amber-400",
    icon: CircleMinus,
  },
  past_due: {
    label: "Past due",
    className: "border-destructive/20 bg-destructive/10 text-destructive",
    icon: CircleAlert,
  },
  pending: {
    label: "Pending",
    className: "",
    icon: Clock,
  },
  expired: {
    label: "Expired",
    className: "",
    icon: CircleMinus,
  },
  incomplete: {
    label: "Incomplete",
    className: "",
    icon: CircleDashed,
  },
};

function StatusBadge({ status, canceled }: { status: string; canceled?: boolean }) {
  // If active but canceledAt is set, show "Canceling" instead of "Active"
  const effectiveStatus = status === "active" && canceled ? "canceled" : status;
  const config = statusConfig[effectiveStatus];

  if (!config) {
    return <Badge variant="outline">Free</Badge>;
  }

  const Icon = config.icon;

  return (
    <Badge
      variant={effectiveStatus === "active" ? "secondary" : effectiveStatus === "past_due" ? "destructive" : "outline"}
      className={config.className}
    >
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
