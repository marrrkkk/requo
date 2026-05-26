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
  FileText,
  Mail,
  Sparkles,
  Users,
  Globe,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { PaymentMethodIcon } from "@/features/billing/components/payment-method-icon";
import type { AccountBillingOverview } from "@/features/billing/types";
import { planMeta, getUsageLimit, type BusinessPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

type PlanUsageData = {
  quotes: number;
  requoQuoteEmailsThisMonth: number;
  aiCredits: { used: number; limit: number };
  members: number;
  liveForms: number;
};

type BillingStatusCardProps = {
  billing: AccountBillingOverview;
  freePlanUsage?: {
    inquiries: number;
    quotes: number;
    requoQuoteEmailsThisMonth: number;
  };
  /** Full usage data for the redesigned limits grid (all plans). */
  planUsage?: PlanUsageData;
  variant?: "full" | "overview";
};

export function BillingStatusCard({
  billing,
  freePlanUsage,
  planUsage,
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
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route redirect, not client navigation */}
                  <a href="/api/billing/polar/customer-portal" target="_blank" rel="noopener noreferrer">
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

      {/* Usage Limits Grid */}
      {planUsage ? (
        <UsageLimitsGrid plan={currentPlan} usage={planUsage} />
      ) : isFreePlan && freePlanUsage ? (
        <UsageLimitsGrid
          plan={currentPlan}
          usage={{
            quotes: freePlanUsage.quotes,
            requoQuoteEmailsThisMonth: freePlanUsage.requoQuoteEmailsThisMonth,
            aiCredits: { used: 0, limit: 100 },
            members: 1,
            liveForms: 1,
          }}
        />
      ) : null}
    </div>
  );
}

/* ── Usage Limits Grid ─────────────────────────────────────────────────── */

type UsageLimitItem = {
  icon: React.ElementType;
  label: string;
  current: number;
  limit: number | null;
  /** Color for progress bar when approaching/at limit (default: primary). */
  warningThreshold?: number;
};

function UsageLimitsGrid({
  plan,
  usage,
}: {
  plan: BusinessPlan;
  usage: PlanUsageData;
}) {
  const quotesLimit = getUsageLimit(plan, "quotesPerMonth");
  const emailsLimit = getUsageLimit(plan, "requoQuoteEmailsPerMonth");
  const membersLimit = getUsageLimit(plan, "membersPerBusiness");
  const formsLimit = getUsageLimit(plan, "liveFormsPerBusiness");

  const limits: UsageLimitItem[] = [
    {
      icon: FileText,
      label: "Quotes",
      current: usage.quotes,
      limit: quotesLimit,
    },
    {
      icon: Mail,
      label: "Emails sent",
      current: usage.requoQuoteEmailsThisMonth,
      limit: emailsLimit,
    },
    {
      icon: Sparkles,
      label: "AI credits",
      current: usage.aiCredits.used,
      limit: usage.aiCredits.limit,
    },
    {
      icon: Users,
      label: "Members",
      current: usage.members,
      limit: membersLimit,
    },
    {
      icon: Globe,
      label: "Live forms",
      current: usage.liveForms,
      limit: formsLimit,
    },
  ];

  return (
    <Card className="border-border/75 bg-card overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {limits.map((item, i) => (
            <UsageLimitCell key={item.label} {...item} isFirst={i === 0} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UsageLimitCell({
  icon: Icon,
  label,
  current,
  limit,
  isFirst,
}: UsageLimitItem & { isFirst?: boolean }) {
  const isUnlimited = limit === null;
  const pct = isUnlimited
    ? 0
    : limit > 0
      ? Math.min(100, Math.round((current / limit) * 100))
      : 0;
  const isAtLimit = !isUnlimited && current >= (limit ?? 0);
  const isNearLimit = !isUnlimited && pct >= 80 && !isAtLimit;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-border/60 p-5",
        !isFirst && "border-l",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums text-foreground">
          {current.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">
          / {isUnlimited ? "∞" : limit.toLocaleString()}
        </span>
      </div>
      {isUnlimited ? (
        <div className="h-1.5 w-full rounded-full bg-primary/20">
          <div className="h-full w-full rounded-full bg-primary/40" />
        </div>
      ) : (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
          <div
            className={cn(
              "h-full rounded-full transition-all motion-reduce:transition-none",
              isAtLimit
                ? "bg-destructive"
                : isNearLimit
                  ? "bg-amber-500"
                  : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
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
