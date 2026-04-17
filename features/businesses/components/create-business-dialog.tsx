"use client";

import { useState } from "react";
import { ArrowUpRight, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckoutDialog } from "@/features/billing/components/checkout-dialog";
import { CreateBusinessForm } from "@/features/businesses/components/create-business-form";
import type { CreateBusinessActionState } from "@/features/businesses/types";
import type { WorkspaceListItem } from "@/features/workspaces/types";
import type { WorkspacePlan } from "@/lib/plans/plans";
import type { BillingCurrency, BillingRegion } from "@/lib/billing/types";

type CreateBusinessDialogProps = {
  action: (
    state: CreateBusinessActionState,
    formData: FormData,
  ) => Promise<CreateBusinessActionState>;
  workspaces: WorkspaceListItem[];
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
  workspaces,
  isLocked,
  billingProps,
}: CreateBusinessDialogProps) {
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (isLocked && billingProps) {
    return (
      <>
        <Button onClick={() => setOpen(true)}>
          <PlusCircle data-icon="inline-start" />
          Create business
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Upgrade to add more businesses</DialogTitle>
              <DialogDescription>
                The Free plan supports one business per workspace. Upgrade to Pro to manage up to 10 businesses, or Business for unlimited.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  setCheckoutOpen(true);
                }}
              >
                <ArrowUpRight data-icon="inline-start" />
                Upgrade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          workspaceId={billingProps.workspaceId}
          workspaceSlug={billingProps.workspaceSlug}
          currentPlan={billingProps.currentPlan}
          region={billingProps.region}
          defaultCurrency={billingProps.defaultCurrency}
        />
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
          workspaces={workspaces}
        />
      </DialogContent>
    </Dialog>
  );
}
