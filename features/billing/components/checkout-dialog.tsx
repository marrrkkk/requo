"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { startPolarCheckout } from "@/features/billing/start-checkout";
import type { CheckoutDialogProps } from "@/features/billing/types";

type ControlledCheckoutDialogProps = CheckoutDialogProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangePlan?: () => void;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  plan,
  interval = "monthly",
}: ControlledCheckoutDialogProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Continue to secure checkout</DialogTitle>
          <DialogDescription>
            We&apos;ll redirect you to our payment partner to finish your purchase.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Button
            className="w-full"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await startPolarCheckout({ plan, interval });
                if (result.ok) {
                  // Hosted checkout opened in a new tab (or same-tab
                  // fallback). Close the dialog so the user returns to
                  // the page they came from.
                  onOpenChange(false);
                  return;
                }

                if (result.reason === "already_subscribed") {
                  toast.info(result.message);
                  onOpenChange(false);
                  return;
                }

                toast.error(result.message);
              });
            }}
          >
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Opening checkout…
              </>
            ) : (
              "Continue to checkout"
            )}
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
