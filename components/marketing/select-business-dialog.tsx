"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { BusinessAvatar } from "@/components/shared/business-avatar";
import { PlanBadge } from "@/components/shared/paywall";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  getUserUpgradeEligibleBusinessesAction,
  type UpgradeEligibleBusiness,
} from "@/features/billing/actions";
import { startPolarCheckout } from "@/features/billing/start-checkout";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { getPlanPriceLabel } from "@/lib/billing/plans";
import type {
  BillingCurrency,
  BillingInterval,
  PaidPlan,
} from "@/lib/billing/types";
import { planMeta, type BusinessPlan } from "@/lib/plans/plans";

type SelectBusinessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan: PaidPlan;
  interval: BillingInterval;
  currency: BillingCurrency;
};

export function SelectBusinessDialog({
  open,
  onOpenChange,
  targetPlan,
  interval,
  currency,
}: SelectBusinessDialogProps) {
  const [businesses, setBusinesses] = useState<UpgradeEligibleBusiness[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [startingBusinessId, setStartingBusinessId] = useState<string | null>(
    null,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setIsLoading(true);

    getUserUpgradeEligibleBusinessesAction()
      .then((data) => {
        if (isMounted) {
          setBusinesses(data);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load user businesses for upgrade", error);
        if (isMounted) {
          toast.error("Failed to load your businesses. Please try again.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  function handleSelectBusiness(business: UpgradeEligibleBusiness) {
    if (startingBusinessId) return;

    setStartingBusinessId(business.id);
    const returnTo = getBusinessDashboardPath(business.slug);

    startTransition(async () => {
      try {
        const result = await startPolarCheckout({
          businessId: business.id,
          plan: targetPlan,
          interval,
          returnTo,
        });

        if (!result.ok) {
          if (result.reason === "already_subscribed") {
            toast.info(result.message);
          } else {
            toast.error(result.message);
          }
          setStartingBusinessId(null);
          return;
        }

        onOpenChange(false);
      } catch (error) {
        console.error("Failed to start checkout", error);
        toast.error("An unexpected error occurred while starting checkout.");
        setStartingBusinessId(null);
      }
    });
  }

  const targetPlanLabel = planMeta[targetPlan].label;
  const priceLabel = getPlanPriceLabel(targetPlan, currency, interval);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="border-b border-border/70 p-6 pb-4">
          <DialogTitle className="text-xl font-heading font-semibold">
            Choose a business to upgrade
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select which business should receive the{" "}
            <span className="font-semibold text-foreground">
              {targetPlanLabel}
            </span>{" "}
            plan ({priceLabel}).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-6 pt-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Spinner className="size-6 text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading your businesses…
              </p>
            </div>
          ) : businesses === null || businesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <p className="text-sm font-medium text-foreground">
                No businesses found
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                You need an active business to subscribe to a plan.
              </p>
              <Button asChild size="sm" className="mt-2 font-mono text-xs uppercase tracking-wider">
                <Link href="/onboarding" onClick={() => onOpenChange(false)}>
                  Create a business
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {businesses.map((business) => {
                const isCurrentPlan = business.plan === targetPlan;
                const isHigherPlan =
                  targetPlan === "pro" && business.plan === "business";
                const isStarting = startingBusinessId === business.id;

                return (
                  <div
                    key={business.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BusinessAvatar
                        name={business.name}
                        logoUrl={business.logoUrl}
                        size="default"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {business.name}
                          </p>
                          <PlanBadge plan={business.plan as BusinessPlan} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground font-mono">
                          /{business.slug}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCurrentPlan ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground px-2.5 py-1 rounded-md bg-muted/40 border border-border/50">
                          <Check className="size-3 text-emerald-500" />
                          Current plan
                        </span>
                      ) : isHigherPlan ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground px-2.5 py-1 rounded-md bg-muted/40 border border-border/50">
                          Business tier
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          className="font-mono text-xs uppercase tracking-wider"
                          disabled={isStarting || Boolean(startingBusinessId)}
                          onClick={() => handleSelectBusiness(business)}
                          type="button"
                        >
                          {isStarting ? (
                            <>
                              <Spinner data-icon="inline-start" aria-hidden="true" />
                              Checkout…
                            </>
                          ) : (
                            <>
                              Upgrade
                              <ArrowUpRight data-icon="inline-end" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border/70 bg-muted/20 px-6 py-3.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Need a new business?</span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-medium gap-1 text-primary hover:text-primary"
            onClick={() => onOpenChange(false)}
          >
            <Link href="/new">
              <Plus className="size-3.5" />
              Create business
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
