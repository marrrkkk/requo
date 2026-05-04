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
import { useWorkspaceCheckout } from "@/features/billing/components/workspace-checkout-provider";
import { CreateBusinessForm } from "@/features/businesses/components/create-business-form";
import type { CreateBusinessActionState } from "@/features/businesses/types";
import type { WorkspacePlan } from "@/lib/plans/plans";
import type { BillingCurrency, BillingRegion, PaidPlan } from "@/lib/billing/types";

type CreateBusinessDialogProps = {
  action: (
    state: CreateBusinessActionState,
    formData: FormData,
  ) => Promise<CreateBusinessActionState>;
  workspaceId: string;
  isLocked?: boolean;
  billingProps?: {
    workspaceId: string;
    workspaceSlug: string;
    currentPlan: WorkspacePlan;
    region: BillingRegion;
    defaultCurrency: BillingCurrency;
  };
};

export function CreateBusinessDialog({
  action,
  workspaceId,
  isLocked,
  billingProps,
}: CreateBusinessDialogProps) {
  const workspaceCheckout = useWorkspaceCheckout();
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);
  const useSharedCheckout = Boolean(
    workspaceCheckout &&
      billingProps &&
      workspaceCheckout.workspaceId === billingProps.workspaceId,
  );

  if (isLocked && billingProps) {
    return (
      <>
        <Button onClick={() => setOpen(true)}>
          <PlusCircle data-icon="inline-start" />
          Create business
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Unlock unlimited businesses</DialogTitle>
              <DialogDescription>
                You&apos;ve reached the limit of your Free plan. Upgrade to Pro to manage up to 10 businesses, or Business for unlimited.
              </DialogDescription>
            </DialogHeader>
              <DialogBody className="pt-2">
                <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                  <p className="meta-label mb-2.5">Pro plan includes</p>
                  <ul className="flex flex-col gap-2">
                    {[
                      "Up to 10 businesses per workspace",
                      "Unlimited inquiry forms",
                      "Custom branding and colors",
                      "AI-powered quote drafting",
                    ].map((feature) => (
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
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setOpen(false);
                    if (useSharedCheckout && workspaceCheckout) {
                      if (workspaceCheckout.pendingCheckout) {
                        workspaceCheckout.continueCheckout();
                        return;
                      }

                      workspaceCheckout.openPlanSelection();
                      return;
                    }

                    setPlanSheetOpen(true);
                  }}
                >
                  <ArrowUpRight data-icon="inline-start" />
                  Upgrade to Pro
                </Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>

        {!useSharedCheckout ? (
          <>
            <PlanSelectionSheet
              currentPlan={billingProps.currentPlan}
              defaultCurrency={billingProps.defaultCurrency}
              onOpenChange={setPlanSheetOpen}
              onSelectPlan={(plan) => {
                setSelectedPlan(plan);
                setPlanSheetOpen(false);
                setCheckoutOpen(true);
              }}
              open={planSheetOpen}
              region={billingProps.region}
            />
            {selectedPlan ? (
              <CheckoutDialog
                currentPlan={billingProps.currentPlan}
                defaultCurrency={billingProps.defaultCurrency}
                onOpenChange={setCheckoutOpen}
                open={checkoutOpen}
                plan={selectedPlan}
                region={billingProps.region}
                workspaceId={billingProps.workspaceId}
                workspaceSlug={billingProps.workspaceSlug}
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
          workspaceId={workspaceId}
        />
      </DialogContent>
    </Dialog>
  );
}
