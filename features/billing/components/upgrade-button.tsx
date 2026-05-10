"use client";

import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";
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
  currentPlan,
  targetPlan,
  variant = "default",
  size = "sm",
  className,
  children,
  interval = "monthly",
}: UpgradeButtonProps) {
  const router = useRouter();
  const businessCheckout = useBusinessCheckout();
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
      onClick={(event) => {
        event.preventDefault();
        if (businessCheckout && businessCheckout.businessId === businessId) {
          businessCheckout.openPlanSelection(nextPlan);
          return;
        }

        const params = new URLSearchParams({
          interval,
          plan: nextPlan,
        });
        router.push(`/account/billing/checkout?${params.toString()}`);
      }}
      size={size}
      variant={variant}
    >
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
