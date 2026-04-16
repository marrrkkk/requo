"use client";

/**
 * Billing status card for workspace overview and settings.
 * Shows subscription status, plan, billing period, and actions.
 */

import { useActionState } from "react";
import { CreditCard, QrCode, CircleCheck, CircleAlert, Clock, CircleMinus, CircleDashed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { PlanBadge } from "@/components/shared/paywall";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { cancelSubscriptionAction } from "@/features/billing/actions";
import type { WorkspaceBillingOverview, CancelActionState } from "@/features/billing/types";
import { planMeta } from "@/lib/plans";
import { getPlanPriceLabel } from "@/lib/billing/plans";

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
  const hasSubscription = subscription && subscription.status !== "free";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Billing</CardTitle>
          <StatusBadge status={subscription?.status ?? "free"} />
        </div>
        <CardDescription>
          {isFreePlan
            ? "Upgrade to unlock premium features for your workspace."
            : `Your workspace is on the ${planMeta[currentPlan].label} plan.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        {/* Current plan details */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <PlanBadge plan={currentPlan} />
                <p className="text-xs text-muted-foreground">
                  {planMeta[currentPlan].description}
                </p>
              </div>
              {!isFreePlan && subscription ? (
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {getPlanPriceLabel(
                    currentPlan as "pro" | "business",
                    subscription.currency,
                  )}
                </p>
              ) : null}
            </div>

            {hasSubscription ? (
              <>
                <Separator className="bg-border/60" />
                <div className="grid gap-2 text-sm">
                  {subscription.provider ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Provider</span>
                      <div className="flex items-center gap-1.5">
                        {subscription.provider === "paymongo" ? (
                          <QrCode className="size-3.5 text-muted-foreground" />
                        ) : (
                          <CreditCard className="size-3.5 text-muted-foreground" />
                        )}
                        <span className="text-foreground">
                          {subscription.provider === "paymongo"
                            ? "QR Ph"
                            : "Card"}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {subscription.currency ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="text-foreground">
                        {subscription.currency}
                      </span>
                    </div>
                  ) : null}

                  {subscription.currentPeriodEnd ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {subscription.status === "canceled"
                          ? "Access until"
                          : "Next renewal"}
                      </span>
                      <span className="text-foreground">
                        {new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Success / error messages */}
        {cancelState.success ? (
          <p className="text-sm text-primary">{cancelState.success}</p>
        ) : null}
        {cancelState.error ? (
          <p className="text-sm text-destructive">{cancelState.error}</p>
        ) : null}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
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
          (subscription.status === "active" || subscription.status === "pending") ? (
            <form action={cancelAction}>
              <input name="workspaceId" type="hidden" value={workspaceId} />
              <Button
                disabled={isCanceling}
                size="sm"
                type="submit"
                variant="ghost"
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
        </div>
      </CardContent>
    </Card>
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
    label: "Cancels at period end",
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

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status];

  if (!config) {
    return <Badge variant="outline">Free</Badge>;
  }

  const Icon = config.icon;

  return (
    <Badge variant={status === "active" ? "secondary" : status === "past_due" ? "destructive" : "outline"} className={config.className}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
