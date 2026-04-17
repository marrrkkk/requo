"use client";

/**
 * Billing status card for workspace settings.
 * SaaS-style billing overview with current plan, subscription details,
 * payment method info, and action buttons.
 */

import { useActionState } from "react";
import {
  CreditCard,
  QrCode,
  CircleCheck,
  CircleAlert,
  Clock,
  CircleMinus,
  CircleDashed,
  Zap,
  Crown,
  CalendarDays,
  Receipt,
  Shield,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

import { Spinner } from "@/components/ui/spinner";
import { PlanBadge } from "@/components/shared/paywall";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { cancelSubscriptionAction } from "@/features/billing/actions";
import type { WorkspaceBillingOverview, CancelActionState } from "@/features/billing/types";
import { planMeta, getUsageLimit } from "@/lib/plans";
import { getPlanPriceLabel } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type BillingStatusCardProps = {
  billing: WorkspaceBillingOverview;
};

export function BillingStatusCard({ billing }: BillingStatusCardProps) {
  const { subscription, currentPlan, workspaceId, workspaceSlug, region, defaultCurrency } =
    billing;
  const [cancelState, cancelAction, isCanceling] = useActionState(
    cancelSubscriptionAction,
    {} as CancelActionState,
  );

  const isFreePlan = currentPlan === "free";
  const hasActiveSubscription =
    subscription &&
    (subscription.status === "active" || subscription.status === "past_due");
  const hasPendingSubscription =
    subscription && subscription.status === "pending";
  const hasSubscription = hasActiveSubscription || hasPendingSubscription;

  return (
    <div className="flex flex-col gap-6">
      {/* Current plan overview */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="meta-label">Current plan</span>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">
                  {planMeta[currentPlan].label}
                </CardTitle>
                {hasSubscription ? (
                  <StatusBadge status={subscription.status} canceled={!!subscription.canceledAt} />
                ) : null}
              </div>
            </div>
            <PlanBadge plan={currentPlan} />
          </div>
        </CardHeader>

        <CardContent className="grid gap-5">
          {/* Price + description */}
          <div className="flex flex-col gap-1.5">
            {!isFreePlan && subscription ? (
              <p className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                {getPlanPriceLabel(
                  currentPlan as "pro" | "business",
                  subscription.currency,
                )}
              </p>
            ) : (
              <p className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                $0
                <span className="text-base font-normal text-muted-foreground"> /forever</span>
              </p>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {planMeta[currentPlan].description}
            </p>
          </div>

          {/* Subscription details grid */}
          {hasSubscription ? (
            <div className="soft-panel grid gap-0 divide-y divide-border/60 overflow-hidden rounded-xl px-0 py-0">
              {subscription.provider ? (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {subscription.provider === "paymongo" ? (
                      <QrCode className="size-4" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    <span>Payment method</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {subscription.provider === "paymongo"
                      ? "QR Ph (GCash, Maya)"
                      : "Credit / debit card"}
                  </span>
                </div>
              ) : null}

              {subscription.currency ? (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Receipt className="size-4" />
                    <span>Billing currency</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {subscription.currency}
                  </span>
                </div>
              ) : null}

              {subscription.currentPeriodEnd ? (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" />
                    <span>
                      {subscription.canceledAt || subscription.status === "canceled"
                        ? "Access until"
                        : "Next renewal"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ) : null}

              {subscription.currentPeriodStart ? (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="size-4" />
                    <span>Billing period started</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {new Date(subscription.currentPeriodStart).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

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

        {/* Actions footer */}
        <CardFooter className="flex-wrap gap-2.5">
          {isFreePlan || currentPlan === "pro" ? (
            <UpgradeButton
              currentPlan={currentPlan}
              defaultCurrency={defaultCurrency}
              region={region}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
            />
          ) : null}

          {hasSubscription &&
          !subscription.canceledAt &&
          (subscription.status === "active" || subscription.status === "pending") ? (
            <form action={cancelAction}>
              <input name="workspaceId" type="hidden" value={workspaceId} />
              <Button
                disabled={isCanceling}
                size="sm"
                type="submit"
                variant="ghost"
                className="text-muted-foreground"
              >
                {isCanceling ? (
                  <>
                    <Spinner aria-hidden="true" />
                    Canceling...
                  </>
                ) : subscription.status === "pending" ? (
                  "Cancel pending payment"
                ) : (
                  "Cancel subscription"
                )}
              </Button>
            </form>
          ) : null}
        </CardFooter>
      </Card>

      {/* Plan comparison — always show for free/pro */}
      {(isFreePlan || currentPlan === "pro") ? (
        <Card>
          <CardHeader>
            <CardTitle>Compare plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["free", "pro", "business"] as const).map((plan) => {
                const isCurrent = plan === currentPlan;
                const meta = planMeta[plan];
                const PlanIcon = plan === "pro" ? Zap : plan === "business" ? Crown : null;

                return (
                  <div
                    className={cn(
                      "relative flex flex-col gap-3 rounded-xl border p-4",
                      isCurrent
                        ? "border-primary/30 bg-accent/20 shadow-[0_0_0_1px_hsl(var(--primary)/0.1)]"
                        : "border-border/60 bg-card/40",
                    )}
                    key={plan}
                  >
                    {isCurrent ? (
                      <Badge variant="secondary" className="absolute -top-2.5 right-3 border-primary/20 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/15">
                        Current
                      </Badge>
                    ) : null}
                    <div className="flex items-center gap-2">
                      {PlanIcon ? <PlanIcon className={cn("size-4", plan === "pro" ? "fill-current text-primary" : "text-violet-500")} /> : null}
                      <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                    </div>
                    <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                      {plan === "free"
                        ? "$0"
                        : getPlanPriceLabel(plan, defaultCurrency).replace("/mo", "")}
                      <span className="text-xs font-normal text-muted-foreground">
                        {plan === "free" ? " /forever" : " /mo"}
                      </span>
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {meta.description}
                    </p>
                    {/* Key limits */}
                    <div className="mt-auto flex flex-col gap-1.5 pt-2">
                      <PlanLimit label="Inquiries" value={getUsageLimit(plan, "inquiriesPerMonth")} />
                      <PlanLimit label="Quotes" value={getUsageLimit(plan, "quotesPerMonth")} />
                      <PlanLimit label="Businesses" value={getUsageLimit(plan, "businessesPerWorkspace")} />
                      <PlanLimit label="Members" value={getUsageLimit(plan, "membersPerWorkspace")} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/* ── Plan limit row ──────────────────────────────────────────────────────── */

function PlanLimit({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">
        {value === null ? "Unlimited" : value}
      </span>
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
