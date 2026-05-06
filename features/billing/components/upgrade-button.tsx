"use client";

/**
 * Upgrade button that opens the checkout dialog.
 * Used in paywall components, workspace overview, and pricing pages.
 */

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CheckoutDialog } from "@/features/billing/components/checkout-dialog";
import { PlanSelectionSheet } from "@/features/billing/components/plan-selection-sheet";
import { useWorkspaceCheckout } from "@/features/billing/components/workspace-checkout-provider";
import type { WorkspacePlan } from "@/lib/plans/plans";
import type { BillingCurrency, BillingRegion, PaidPlan } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

type UpgradeButtonProps = {
  workspaceId: string;
  workspaceSlug: string;
  currentPlan: WorkspacePlan;
  targetPlan?: "pro" | "business";
  region?: BillingRegion;
  defaultCurrency?: BillingCurrency;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
};

export function UpgradeButton({
  workspaceId,
  workspaceSlug,
  currentPlan,
  targetPlan,
  region = "INTL",
  defaultCurrency = "USD",
  variant = "default",
  size = "sm",
  className,
  children,
}: UpgradeButtonProps) {
  const workspaceCheckout = useWorkspaceCheckout();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);
  const effectiveCurrentPlan =
    workspaceCheckout?.workspaceId === workspaceId
      ? workspaceCheckout.currentPlan
      : currentPlan;

  if (effectiveCurrentPlan === "business") {
    return null; // Already on highest plan
  }

  if (workspaceCheckout && workspaceCheckout.workspaceId === workspaceId) {
    const hasPendingCheckout = Boolean(workspaceCheckout.pendingCheckout);

    return (
      <Button
        className={cn(className)}
        onClick={() => {
          if (hasPendingCheckout) {
            workspaceCheckout.continueCheckout();
            return;
          }

          workspaceCheckout.openPlanSelection(targetPlan);
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
        className={cn(className)}
        onClick={() => setSheetOpen(true)}
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
        onSelectPlan={(plan) => {
          setSelectedPlan(plan);
          setSheetOpen(false);
          setCheckoutOpen(true);
        }}
        open={sheetOpen}
        region={region}
        targetPlan={targetPlan}
      />
      {selectedPlan ? (
        <CheckoutDialog
          currentPlan={effectiveCurrentPlan}
          defaultCurrency={defaultCurrency}
          onOpenChange={setCheckoutOpen}
          open={checkoutOpen}
          plan={selectedPlan}
          region={region}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
        />
      ) : null}
    </>
  );
}
