"use client";

/**
 * Upgrade button that opens the checkout dialog.
 * Used in paywall components, business overview, and pricing pages.
 */

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";
import { PlanSelectionSheet } from "@/features/billing/components/plan-selection-sheet";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import type { BillingCurrency, BillingInterval, BillingRegion, PaidPlan } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

const CheckoutDialog = dynamic(() =>
  import("@/features/billing/components/checkout-dialog").then(
    (module) => module.CheckoutDialog,
  ),
);

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
};

export function UpgradeButton({
  userId,
  businessId,
  businessSlug,
  currentPlan,
  targetPlan,
  region = "INTL",
  defaultCurrency = "USD",
  variant = "default",
  size = "sm",
  className,
  children,
}: UpgradeButtonProps) {
  const businessCheckout = useBusinessCheckout();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const effectiveCurrentPlan =
    businessCheckout?.businessId === businessId
      ? businessCheckout.currentPlan
      : currentPlan;

  if (effectiveCurrentPlan === "business") {
    return null; // Already on highest plan
  }

  if (businessCheckout && businessCheckout.businessId === businessId) {
    const hasPendingCheckout = Boolean(businessCheckout.pendingCheckout);

    return (
      <Button
        type="button"
        className={cn(className)}
        onClick={(e) => {
          e.preventDefault();
          if (hasPendingCheckout) {
            businessCheckout.continueCheckout();
            return;
          }

          businessCheckout.openPlanSelection(targetPlan);
        }}
        size={size}
        variant={variant}
      >
        {hasPendingCheckout ? (
          "Continue"
        ) : (
          children ?? (
            <>
              <ArrowUpRight data-icon="inline-start" />
              {effectiveCurrentPlan === "free"
                ? "Upgrade to Pro"
                : "Upgrade to Business"}
            </>
          )
        )}
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        className={cn(className)}
        onClick={(e) => {
          e.preventDefault();
          setSheetOpen(true);
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
      
        <PlanSelectionSheet
          defaultCurrency={defaultCurrency}
          currentPlan={effectiveCurrentPlan}
          onOpenChange={setSheetOpen}
          onSelectPlan={(plan, interval) => {
            setSelectedPlan(plan);
            setSelectedInterval(interval);
            setSheetOpen(false);
            setCheckoutOpen(true);
          }}
          open={sheetOpen}
          region={region}
          targetPlan={targetPlan}
        />
      
      {selectedPlan ? (
        <Suspense fallback={null}>
          <CheckoutDialog
            currentPlan={effectiveCurrentPlan}
            defaultCurrency={defaultCurrency}
            onChangePlan={() => {
              setCheckoutOpen(false);
              setSelectedPlan(null);
              setSheetOpen(true);
            }}
            onOpenChange={setCheckoutOpen}
            open={checkoutOpen}
            plan={selectedPlan}
            interval={selectedInterval}
            region={region}
            userId={userId}
            businessId={businessId}
            businessSlug={businessSlug}
          />
        </Suspense>
      ) : null}
    </>
  );
}
