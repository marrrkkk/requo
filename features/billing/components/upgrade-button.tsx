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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);

  if (currentPlan === "business") {
    return null; // Already on highest plan
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
            {currentPlan === "free" ? "Upgrade to Pro" : "Upgrade to Business"}
          </>
        )}
      </Button>
      <PlanSelectionSheet
        defaultCurrency={defaultCurrency}
        currentPlan={currentPlan}
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
          currentPlan={currentPlan}
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
