"use client";

import { useState } from "react";
import { ArrowUpRight, PlusCircle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckoutDialog } from "@/features/billing/components/checkout-dialog";
import { PlanSelectionSheet } from "@/features/billing/components/plan-selection-sheet";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";
import { CreateBusinessForm } from "@/features/businesses/components/create-business-form";
import type {
  BusinessQuotaSnapshot,
  CreateBusinessActionState,
} from "@/features/businesses/types";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import { getUpgradePlan, planMeta } from "@/lib/plans/plans";
import type { BillingCurrency, BillingInterval, BillingRegion, PaidPlan } from "@/lib/billing/types";

type CreateBusinessDialogProps = {
  action: (
    state: CreateBusinessActionState,
    formData: FormData,
  ) => Promise<CreateBusinessActionState>;
  businessId: string;
  isLocked?: boolean;
  businessQuota?: BusinessQuotaSnapshot;
  billingProps?: {
    userId: string;
    businessId: string;
    businessSlug: string;
    currentPlan: plan;
    region: BillingRegion;
    defaultCurrency: BillingCurrency;
  };
};

export function CreateBusinessDialog({
  action,
  businessId,
  isLocked,
  businessQuota,
  billingProps,
}: CreateBusinessDialogProps) {
  const businessCheckout = useBusinessCheckout();
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("monthly");
  const useSharedCheckout = Boolean(
    businessCheckout &&
      billingProps &&
      businessCheckout.businessId === billingProps.businessId,
  );
  const effectiveCurrentPlan =
    useSharedCheckout && businessCheckout
      ? businessCheckout.currentPlan
      : billingProps?.currentPlan;
  const quotaLocked = businessQuota ? !businessQuota.allowed : Boolean(isLocked);
  const lockedPlan =
    effectiveCurrentPlan ?? businessQuota?.plan ?? billingProps?.currentPlan ?? "free";
  const upgradePlan = getUpgradePlan(lockedPlan);
  const upgradeLabel = upgradePlan
    ? `Upgrade to ${planMeta[upgradePlan].label}`
    : "View billing";
  const limitLabel =
    businessQuota?.limit === null
      ? "unlimited businesses"
      : `${businessQuota?.limit ?? 1} total business${
          (businessQuota?.limit ?? 1) === 1 ? "" : "es"
        } across all businesses`;
  const lockedDescription = businessQuota
    ? `Your ${planMeta[lockedPlan].label} plan supports ${limitLabel}. Upgrade this business to add more.`
    : "Upgrade this business to add more businesses.";
  const upgradeFeatures =
    upgradePlan === "business"
      ? [
          "Unlimited businesses",
          "Team members and roles",
          "Higher knowledge and upload limits",
          "Priority support",
        ]
      : [
          "Up to 10 total businesses across businesses",
          "Unlimited inquiry forms",
          "Custom branding and colors",
          "AI-powered quote drafting",
        ];

  if (quotaLocked) {
    return (
      <>
        <Button onClick={() => setOpen(true)}>
          <PlusCircle data-icon="inline-start" />
          Create business
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {upgradePlan === "business"
                  ? "Unlock unlimited businesses"
                  : "Add more businesses"}
              </DialogTitle>
              <DialogDescription>
                {lockedDescription}
              </DialogDescription>
            </DialogHeader>
              <DialogBody className="pt-2">
                <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                  <p className="meta-label mb-2.5">
                    {upgradePlan
                      ? `${planMeta[upgradePlan].label} plan includes`
                      : "Current plan"}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {upgradeFeatures.map((feature) => (
                      <li
                        className="flex items-center gap-2.5 text-sm text-foreground"
                        key={feature}
                      >
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="size-3" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                {billingProps && upgradePlan ? (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setOpen(false);
                      if (useSharedCheckout && businessCheckout) {
                        if (businessCheckout.pendingCheckout) {
                          businessCheckout.continueCheckout();
                          return;
                        }

                        businessCheckout.openPlanSelection();
                        return;
                      }

                      setPlanSheetOpen(true);
                    }}
                  >
                    <ArrowUpRight data-icon="inline-start" />
                    {upgradeLabel}
                  </Button>
                ) : null}
              </DialogFooter>
            </DialogContent>
        </Dialog>

        {!useSharedCheckout && billingProps ? (
          <>
            <PlanSelectionSheet
              currentPlan={effectiveCurrentPlan ?? billingProps.currentPlan}
              defaultCurrency={billingProps.defaultCurrency}
              onOpenChange={setPlanSheetOpen}
              onSelectPlan={(plan, interval) => {
                setSelectedPlan(plan);
                setSelectedInterval(interval);
                setPlanSheetOpen(false);
                setCheckoutOpen(true);
              }}
              open={planSheetOpen}
              region={billingProps.region}
            />
            {selectedPlan ? (
              <CheckoutDialog
                currentPlan={effectiveCurrentPlan ?? billingProps.currentPlan}
                defaultCurrency={billingProps.defaultCurrency}
                onOpenChange={setCheckoutOpen}
                open={checkoutOpen}
                plan={selectedPlan}
                interval={selectedInterval}
                region={billingProps.region}
                userId={billingProps.userId}
                businessId={billingProps.businessId}
                businessSlug={billingProps.businessSlug}
              />
            ) : null}
          </>
        ) : null}
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle data-icon="inline-start" />
          Create business
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle>Create new business</DialogTitle>
          <DialogDescription>
            Use a starter template to set up inquiry capture, quote defaults, and follow-up basics.
          </DialogDescription>
        </DialogHeader>
        <CreateBusinessForm
          action={action}
          businessId={businessId}
        />
      </DialogContent>
    </Dialog>
  );
}

