"use client";

/**
 * Billing status card for business settings.
 * Modern SaaS-style billing overview with a vibrant current plan card,
 * billing details, usage metrics, and a link to the Polar customer portal
 * for cancel/refund/payment-method changes.
 */

import Image from "next/image";
import {
  CircleCheck,
  CircleAlert,
  Clock,
  CircleMinus,
  CircleDashed,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { PaymentMethodIcon } from "@/features/billing/components/payment-method-icon";
import type { AccountBillingOverview } from "@/features/billing/types";
import { planMeta, getUsageLimit } from "@/lib/plans";

type BillingStatusCardProps = {
  billing: AccountBillingOverview;
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
  const {
    subscription,
    currentPlan: billingCurrentPlan,
    userId,
    businessId,
    businessSlug,
  } = billing;
  const businessCheckout = useBusinessCheckout();
  const currentPlan =
    businessCheckout?.businessId === businessId
      ? businessCheckout.currentPlan
      : billingCurrentPlan;

  const isFreePlan = currentPlan === "free";

  const getPaymentMethodDisplay = (_provider: string, method?: string | null) => {
    if (!method) return "Credit or debit card";

    switch (method.toLowerCase()) {
      case "visa": return "Visa";
      case "mastercard": return "Mastercard";
      case "paypal": return "PayPal";
      case "apple_pay": return "Apple Pay";
      case "google_pay": return "Google Pay";
      case "amex": return "American Express";
      case "discover": return "Discover";
      case "diners_club": return "Diners Club";
      case "jcb": return "JCB";
      case "unionpay": return "UnionPay";
      case "card": return "Credit Card";
      default: return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  const hasActiveSubscription =
    subscription &&
    (subscription.status === "active" || subscription.status === "past_due");
  const hasPendingSubscription =
    subscription && subscription.status === "pending";
  const hasSubscription = hasActiveSubscription || hasPendingSubscription;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,1fr)] lg:grid-cols-[1fr_1fr] items-stretch">
        
        {/* Plan Card */}
        <Card className="flex flex-col border-border/75 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current subscription plan
            </CardTitle>
            <Image
              src="/logo.svg"
              alt="Requo Logo"
              width={24}
              height={24}
              className="opacity-20 grayscale dark:opacity-40"
              data-slot="card-action"
            />
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-6 pb-6">
            <div className="flex items-center gap-3">
              <CardTitle className="text-5xl font-bold capitalize tracking-tight">
                {planMeta[currentPlan].label}
              </CardTitle>
              {hasSubscription ? (
                <StatusBadge
                  status={subscription.status}
                  canceled={!!subscription.canceledAt}
                />
              ) : null}
            </div>
            
            {isFreePlan ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-[34ch]">
                {planMeta[currentPlan].description}
              </p>
            ) : null}

            {currentPlan !== "business" ? (
              <div className="mt-auto flex flex-col items-start gap-3 pt-2">
                <p className="text-sm font-medium text-foreground">
                  Need extra features?
                </p>
                <UpgradeButton
                  currentPlan={currentPlan}
                  userId={userId}
                  businessId={businessId}
                  businessSlug={businessSlug}
                >
                  {variant === "full" ? (
                    <>
                      <ArrowUpRight data-icon="inline-start" />
                      Upgrade plan
                    </>
                  ) : undefined}
                </UpgradeButton>
              </div>
            ) : (
              <div className="mt-auto flex flex-col items-start gap-3 pt-2">
                <p className="text-sm font-medium text-foreground">
                  Enjoying all features?
                </p>
                <Button disabled variant="outline" className="opacity-50 pointer-events-none">
                  Highest plan active
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods & Billing Details */}
        <Card className="flex flex-col border-border/75 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Payment details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-6 pb-6">
            {hasSubscription && (subscription.provider || subscription.currentPeriodEnd) ? (
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4 shadow-sm">
                {subscription.provider ? (
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background shadow-sm">
                      <PaymentMethodIcon method={subscription.paymentMethod} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {getPaymentMethodDisplay(subscription.provider, subscription.paymentMethod)}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                        Primary method
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      No active payment method
                    </p>
                  </div>
                )}

                {subscription.currentPeriodEnd ? (
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground">
                      {subscription.canceledAt || subscription.status === "canceled"
                        ? "Access until"
                        : "Renews"}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                        "en-US",
                        {
                          month: "2-digit",
                          day: "2-digit",
                          year: "2-digit",
                        },
                      ).replace(/\//g, ".")}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : !hasSubscription ? (
              <div className="flex items-center gap-4 rounded-xl border border-border/60 border-dashed bg-muted/10 p-4">
                <p className="text-sm text-muted-foreground">
                  No active payment method
                </p>
              </div>
            ) : null}

            {/* Cancellation warning */}
            {subscription?.canceledAt && subscription.status === "active" ? (
              <Alert
                variant="default"
                className="mt-2 border-amber-200/60 bg-amber-50/50 py-3 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
              >
                <CircleAlert className="size-4" />
                <div>
                  <p className="text-sm font-medium">Subscription canceling</p>
                  <p className="mt-0.5 text-xs opacity-90">
                    You&apos;ll keep full access until the end of the billing period.
                  </p>
                </div>
              </Alert>
            ) : null}

            {hasSubscription &&
            subscription?.providerCustomerId &&
            variant === "full" ? (
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <Button asChild size="sm" className="w-full">
                  <a href="/api/billing/polar/customer-portal">
                    <ExternalLink data-icon="inline-start" />
                    Manage billing
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Update payment method, cancel, or request a refund in the
                  Polar customer portal.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Usage Cards Grid */}
      {isFreePlan && freePlanUsage ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/75 bg-card/97">
            <CardContent className="p-5">
              <UsageMeter
                current={freePlanUsage.quotes}
                label="Quotes"
                limit={getUsageLimit("free", "quotesPerMonth") ?? 30}
              />
            </CardContent>
          </Card>
          <Card className="border-border/75 bg-card/97">
            <CardContent className="p-5">
              <UsageMeter
                current={freePlanUsage.requoQuoteEmailsThisMonth}
                label="Emails sent"
                limit={getUsageLimit("free", "requoQuoteEmailsPerMonth") ?? 15}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
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
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label} used
        </p>
        <div className="mt-1 flex items-baseline gap-1 text-2xl font-bold tracking-tight text-foreground">
          {current}
          <span className="text-sm font-medium text-muted-foreground">
            / {limit}
          </span>
        </div>
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

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  active: {
    label: "Active",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-400/15 dark:text-emerald-400",
    icon: CircleCheck,
  },
  canceled: {
    label: "Canceling",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:border-amber-400/25 dark:bg-amber-400/15 dark:text-amber-400",
    icon: CircleMinus,
  },
  past_due: {
    label: "Past due",
    className:
      "border-destructive/20 bg-destructive/10 text-destructive",
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

function StatusBadge({
  status,
  canceled,
}: {
  status: string;
  canceled?: boolean;
}) {
  // If active but canceledAt is set, show "Canceling" instead of "Active"
  const effectiveStatus = status === "active" && canceled ? "canceled" : status;
  const config = statusConfig[effectiveStatus];

  if (!config) {
    return <Badge variant="outline">Free</Badge>;
  }

  const Icon = config.icon;

  return (
    <Badge
      variant={
        effectiveStatus === "active"
          ? "secondary"
          : effectiveStatus === "past_due"
            ? "destructive"
            : "outline"
      }
      className={config.className}
    >
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
