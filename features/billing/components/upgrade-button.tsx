"use client";

import { ArrowUpRight } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";
import { startDodoCheckout } from "@/features/billing/start-checkout";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import type {
  BillingCurrency,
  BillingInterval,
  BillingRegion,
  PaidPlan,
} from "@/lib/billing/types";
import { cn } from "@/lib/utils";

type UpgradeButtonProps = {
  userId: string;
  businessId: string;
  businessSlug: string;
  currentPlan: plan;
  targetPlan?: "pro" | "business";
  region?: BillingRegion;
  defaultCurrency?: BillingCurrency;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
  interval?: BillingInterval;
};

function resolveTargetPlan(currentPlan: plan, targetPlan?: PaidPlan): PaidPlan {
  if (targetPlan) {
    return targetPlan;
  }
  return currentPlan === "pro" ? "business" : "pro";
}

export function UpgradeButton({
  businessId,
  businessSlug,
  currentPlan,
  targetPlan,
  variant = "default",
  size = "sm",
  className,
  children,
  interval = "monthly",
}: UpgradeButtonProps) {
  const businessCheckout = useBusinessCheckout();
  const [isPending, startTransition] = useTransition();
  const effectiveCurrentPlan =
    businessCheckout?.businessId === businessId
      ? businessCheckout.currentPlan
      : currentPlan;

  if (effectiveCurrentPlan === "business") {
    return null;
  }

  const nextPlan = resolveTargetPlan(effectiveCurrentPlan, targetPlan);

  return (
    <Button
      type="button"
      className={cn(className)}
      disabled={isPending || !!businessCheckout?.isStartingCheckout}
      onClick={(event) => {
        event.preventDefault();
        if (businessCheckout && businessCheckout.businessId === businessId) {
          businessCheckout.openPlanSelection(nextPlan);
          return;
        }

        startTransition(async () => {
          const result = await startDodoCheckout({
            plan: nextPlan,
            interval,
            returnTo: businessSlug
              ? getBusinessDashboardPath(businessSlug)
              : undefined,
          });
          if (result.ok) return;
          if (result.reason === "already_subscribed") {
            toast.info(result.message);
            return;
          }
          toast.error(result.message);
        });
      }}
      size={size}
      variant={variant}
    >
      {isPending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
      {children ?? (
        <>
          <ArrowUpRight data-icon="inline-start" />
          {effectiveCurrentPlan === "free"
            ? "Upgrade to Pro"
            : "Upgrade to Business"}
        </>
      )}
    </Button>
  );
}
